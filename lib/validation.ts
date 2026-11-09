import { z } from 'zod';

const positiveInt = z.coerce.number().int().positive();
const urlOrEmpty = z.string().url().or(z.literal('')).optional().default('');

export const CreatePostSchema = z.object({
  content: z.string().max(5000).optional().default(''),
  image_url: urlOrEmpty,
  image_urls: z.array(z.string().url()).max(4).optional(),
  alt_text: z.string().max(500).optional().default(''),
  post_type: z.enum(['post', 'repost', 'quote', 'reel', 'story', 'thread']).optional().default('post'),
  visibility: z.enum(['everyone', 'followers', 'close_friends']).optional().default('everyone'),
  is_anonymous: z.boolean().optional().default(false),
  persona: z.string().max(50).optional().default(''),
  scheduled_at: z.string().datetime().optional(),
  locked_until: z.string().datetime().optional(),
  commitment_deadline: z.string().datetime().optional(),
  ref_post_id: positiveInt.optional(),
  poll: z.object({
    question: z.string().min(1).max(300),
    options: z.array(z.string().max(100)).min(2).max(4),
    duration_hours: z.coerce.number().int().min(1).max(168).optional().default(24),
  }).optional(),
  reaction_poll: z.object({
    options: z.array(z.object({
      label: z.string().max(100),
      emoji: z.string().max(10),
    })).max(5),
  }).optional(),
});

export const SendMessageSchema = z.object({
  receiver_id: positiveInt,
  content: z.string().max(10000).optional().default(''),
  message_type: z.enum(['text', 'image', 'gif', 'poll', 'sticker']).optional().default('text'),
  image_url: urlOrEmpty,
  reply_to_id: positiveInt.optional(),
  is_forwarded: z.boolean().optional().default(false),
  scheduled_at: z.string().datetime().optional(),
});

export const CreateEventSchema = z.object({
  title: z.string().min(1).max(200).transform(s => s.trim()),
  description: z.string().max(5000).optional().default(''),
  cover_url: urlOrEmpty,
  location: z.string().max(300).optional().default(''),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().optional(),
});

export const CreateCollectionSchema = z.object({
  name: z.string().min(1).max(100).transform(s => s.trim()),
});

export const CreateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parent_id: positiveInt.optional(),
  stance: z.enum(['agree', 'disagree', '']).optional().default(''),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().or(z.literal('')).optional(),
  avatar: urlOrEmpty,
  cover: urlOrEmpty,
  is_private: z.boolean().optional(),
});
