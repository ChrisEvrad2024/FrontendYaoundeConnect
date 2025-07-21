// src/app/core/models/comment.model.ts

export interface CommentModel {
    id: number;
    content: string;
    poi_id: number;
    user_id: number;
    parent_id?: number;
    status: 'pending' | 'approved' | 'rejected' | 'flagged';
    moderated_by?: number;
    is_edited: boolean;
    edited_at?: string;
    likes_count: number;
    reports_count: number;
    created_at: string;
    updated_at: string;

    // Relations
    author?: {
        id: number;
        name: string;
        avatar?: string;
    };
    moderator?: {
        id: number;
        name: string;
    };
    parent?: CommentModel;
    replies?: CommentModel[];

    // États UI
    isLiked?: boolean;
    isReported?: boolean;
    showReplies?: boolean;
}

export interface CommentCreateRequest {
    content: string;
    poi_id: number;
    parent_id?: number;
}

export interface CommentUpdateRequest {
    content: string;
}

export interface CommentReportRequest {
    reason: 'spam' | 'inappropriate' | 'harassment' | 'misinformation' | 'other';
    description?: string;
}

export interface CommentListOptions {
    page?: number;
    limit?: number;
    sort_by?: 'created_at' | 'likes_count';
    sort_order?: 'asc' | 'desc';
    status?: 'pending' | 'approved' | 'rejected' | 'flagged';
    include_replies?: boolean;
}

export interface CommentStats {
    poi_id: number;
    total_comments: number;
    total_replies: number;
    average_rating: number;
    status_distribution: {
        pending: number;
        approved: number;
        rejected: number;
        flagged: number;
    };
}

export interface CommentLike {
    id: number;
    comment_id: number;
    user_id: number;
    created_at: string;
}

export interface CommentReport {
    id: number;
    comment_id: number;
    user_id: number;
    reason: string;
    description?: string;
    status: 'pending' | 'reviewed' | 'dismissed';
    reviewed_by?: number;
    created_at: string;
    updated_at: string;
}