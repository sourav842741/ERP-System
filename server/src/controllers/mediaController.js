import { MediaAsset } from '../models/MediaAsset.js';
import { uploadMedia, deleteMedia } from '../config/cloudinary.js';
import { logAudit } from '../middlewares/auditMiddleware.js';

/**
 * Get all media assets with sorting (newest first), search, and pagination
 */
export const getMediaAssets = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 50 } = req.query;
    const query = { isDeleted: false };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search && search.trim() !== '') {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { category: { $regex: search.trim(), $options: 'i' } },
        { tags: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    // Newest first (createdAt: -1) as requested by user
    const [assets, total] = await Promise.all([
      MediaAsset.find(query)
        .populate('uploadedBy', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      MediaAsset.countDocuments(query)
    ]);

    // Calculate aggregated storage stats
    const stats = await MediaAsset.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalBytes: { $sum: '$size' }
        }
      }
    ]);

    const totalStorageBytes = stats[0]?.totalBytes || 0;
    const totalCount = stats[0]?.totalCount || 0;

    res.json({
      success: true,
      data: {
        assets,
        stats: {
          totalCount,
          totalSizeMB: (totalStorageBytes / (1024 * 1024)).toFixed(2)
        },
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / parseInt(limit, 10))
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Upload one image to Cloudinary and save to MediaAsset collection
 */
export const uploadMediaAsset = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload.' });
    }

    const { title, category, tags } = req.body;

    // Clean title or fall back to file's original name
    const resolvedTitle = title && title.trim() !== ''
      ? title.trim()
      : req.file.originalname.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    // Upload to Cloudinary under folder 'erp_media_gallery'
    const uploadResult = await uploadMedia(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'erp_media_gallery'
    );

    const parsedTags = tags
      ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim()).filter(Boolean))
      : [];

    const asset = await MediaAsset.create({
      title: resolvedTitle,
      url: uploadResult.url, // Direct public Cloudinary URL
      publicId: uploadResult.publicId,
      format: uploadResult.format,
      size: uploadResult.size,
      width: uploadResult.width,
      height: uploadResult.height,
      source: uploadResult.source,
      category: category || 'General',
      tags: parsedTags,
      uploadedBy: req.user?._id || null,
      uploaderName: req.user?.name || 'Administrator'
    });

    await logAudit({
      req,
      action: 'MEDIA_ASSET_UPLOADED',
      module: 'Media Gallery',
      entityId: asset._id,
      newValue: { title: asset.title, url: asset.url, publicId: asset.publicId },
      reason: 'Uploaded asset to Cloudinary'
    });

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully to Cloudinary!',
      data: { asset }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Update media asset metadata (Title, Category, Tags)
 */
export const updateMediaAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, tags } = req.body;

    const asset = await MediaAsset.findById(id);
    if (!asset || asset.isDeleted) {
      return res.status(404).json({ success: false, message: 'Media asset not found.' });
    }

    if (title) asset.title = title.trim();
    if (category) asset.category = category.trim();
    if (tags !== undefined) {
      asset.tags = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    await asset.save();

    await logAudit({
      req,
      action: 'MEDIA_ASSET_UPDATED',
      module: 'Media Gallery',
      entityId: asset._id,
      newValue: { title: asset.title, category: asset.category, tags: asset.tags },
      reason: 'Updated media asset metadata'
    });

    res.json({
      success: true,
      message: 'Media asset updated successfully',
      data: { asset }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Delete media asset from MongoDB and purge from Cloudinary servers
 */
export const deleteMediaAsset = async (req, res) => {
  try {
    const { id } = req.params;

    const asset = await MediaAsset.findById(id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Media asset not found.' });
    }

    // Purge from Cloudinary cloud storage
    if (asset.publicId) {
      await deleteMedia(asset.publicId);
    }

    await MediaAsset.findByIdAndDelete(id);

    await logAudit({
      req,
      action: 'MEDIA_ASSET_DELETED',
      module: 'Media Gallery',
      entityId: id,
      oldValue: { title: asset.title, url: asset.url, publicId: asset.publicId },
      reason: 'Deleted image from Cloudinary and database'
    });

    res.json({
      success: true,
      message: 'Media asset permanently deleted from Cloudinary and system.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
