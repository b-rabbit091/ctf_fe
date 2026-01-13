export interface Blog {
    id: number;
    title: string;
    content: string;
    cover_image?: string | File | null; // string for saved URL, File for new upload
    created_at: string;
}
