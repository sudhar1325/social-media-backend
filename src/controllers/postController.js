const fs = require("fs");
const path = require("path");
const Post = require("../models/Post");
const User = require("../models/User");
// optional: use ffprobe-static so no system install needed
let ffmpeg;
try {
  ffmpeg = require("fluent-ffmpeg");
  const ffprobeStatic = require("ffprobe-static");
  ffmpeg.setFfprobePath(ffprobeStatic.path);
} catch {
  ffmpeg = null;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_DURATION = 30; // seconds

// delete a file from disk silently
const removeFile = (filePath) => {
  try {
    fs.unlinkSync(filePath);
  } catch {}
};

// get video duration via ffprobe — returns a Promise<number>
const getVideoDuration = (filePath) =>
  new Promise((resolve, reject) => {
    if (!ffmpeg) return reject(new Error("ffmpeg not available"));
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });

const createPost = async (req, res, next) => {
  const uploadedPaths = (req.files || []).map((f) =>
    path.join(__dirname, "..", "..", "uploads", f.filename),
  );

  try {
    const { description, category } = req.body;

    if (!description && (!req.files || req.files.length === 0)) {
      return res
        .status(400)
        .json({ success: false, message: "Post must have text or media" });
    }

    const mediaFiles = [];
    const errors = [];

    for (const file of req.files || []) {
      const isVideo = file.mimetype.startsWith("video");
      const isImage = file.mimetype.startsWith("image");
      const filePath = path.join(
        __dirname,
        "..",
        "..",
        "uploads",
        file.filename,
      );

      if (isImage) {
        if (file.size > MAX_IMAGE_SIZE) {
          removeFile(filePath);
          errors.push(`"${file.originalname}" exceeds 5 MB limit`);
          continue;
        }
      }

      if (isVideo) {
        try {
          const duration = await getVideoDuration(filePath);
          if (duration > MAX_VIDEO_DURATION) {
            removeFile(filePath);
            errors.push(
              `"${file.originalname}" is ${Math.round(duration)}s — videos must be under 30 seconds`,
            );
            continue;
          }
        } catch {
          // if ffprobe unavailable, skip duration check but still save
        }
      }

      mediaFiles.push({
        url: `/uploads/${file.filename}`,
        type: isVideo ? "video" : "image",
      });
    }

    // if every file failed validation, return all errors
    if (req.files?.length > 0 && mediaFiles.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: errors.join(" | ") });
    }

    let mediaType = "text";
    let mediaURL = "";

    if (mediaFiles.length > 0) {
      const hasImage = mediaFiles.some((f) => f.type === "image");
      const hasVideo = mediaFiles.some((f) => f.type === "video");
      if (hasImage && hasVideo) mediaType = "mixed";
      else if (hasVideo) mediaType = "video";
      else mediaType = "image";
      mediaURL = mediaFiles[0].url;
    }

    const post = await Post.create({
      userId: req.user._id,
      description: description || "",
      mediaType,
      mediaURL,
      mediaFiles,
      category: category || "general",
      status: "pending",
    });

    // warn about partial failures (some files ok, some rejected)
    const response = { success: true, post };
    if (errors.length > 0) {
      response.warnings = errors;
    }

    res.status(201).json(response);
  } catch (err) {
    // clean up any uploaded files on unexpected error
    uploadedPaths.forEach(removeFile);
    next(err);
  }
};

const getFeed = async (req, res, next) => {
  try {
    // Pagination
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);

    // Search
    const search = (req.query.search || "").trim();

    // Base filter
    const filter = {
      status: "approved",
    };

    // Search filter
    if (search.length > 0) {
      const users = await User.find({
        username: { $regex: search, $options: "i" },
      }).select("_id");

      const userIds = users.map((u) => u._id);

      filter.$or = [
        {
          description: { $regex: search, $options: "i" },
        },
        {
          category: { $regex: search, $options: "i" },
        },
        {
          userId: { $in: userIds },
        },
      ];
    }

    // Count
    const totalPosts = await Post.countDocuments(filter);

    // Fetch posts
    const posts = await Post.find(filter)
      .populate("userId", "username profileImage")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      posts,
      page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
    });
  } catch (err) {
    next(err);
  }
};

const getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      "userId",
      "username profileImage",
    );
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    res.json({ success: true, post });
  } catch (err) {
    next(err);
  }
};

const getMyPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, posts });
  } catch (err) {
    next(err);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not your post" });
    }
    post.description = req.body.description ?? post.description;
    post.category = req.body.category ?? post.category;
    post.status = "pending";
    post.rejectionReason = "";
    await post.save();
    res.json({ success: true, post });
  } catch (err) {
    next(err);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    if (
      post.userId.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }
    await post.deleteOne();
    res.json({ success: true, message: "Post deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPost,
  getFeed,
  getPost,
  getMyPosts,
  updatePost,
  deletePost,
};
