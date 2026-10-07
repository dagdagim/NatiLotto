import { DrawStatus, PrizeCategory } from './enums.js';

export interface PrizeImageDto {
  id: string;
  url: string;
  isPrimary: boolean;
  displayOrder: number;
}

export interface PrizeDto {
  id: string;
  title: string;
  description: string;
  specifications: Record<string, string>;
  retailValueEtb: number;
  category: PrizeCategory;
  images: PrizeImageDto[];
}

export interface DrawDto {
  id: string;
  drawNumber: string; // e.g., NL-000123
  title: string;
  description: string;
  ticketPriceEtb: number;
  totalTickets: number;
  soldTickets: number;
  remainingTickets: number;
  maxTicketsPerUser: number;
  status: DrawStatus;
  salesStartDate: string;
  salesEndDate: string;
  drawDate: string;
  permitNumber?: string;
  prize: PrizeDto;
  isFeatured: boolean;
  snapshotHash?: string;
  resultHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDrawDto {
  title: string;
  description: string;
  ticketPriceEtb: number;
  totalTickets: number;
  maxTicketsPerUser?: number;
  salesStartDate: string;
  salesEndDate: string;
  drawDate: string;
  permitNumber: string;
  isFeatured?: boolean;
  prize: {
    title: string;
    description: string;
    specifications: Record<string, string>;
    retailValueEtb: number;
    category: PrizeCategory;
    imageUrls: string[];
  };
}

export interface DrawFilterQueryDto {
  status?: DrawStatus;
  category?: PrizeCategory;
  isFeatured?: boolean;
  search?: string;
  sortBy?: 'endingSoon' | 'newest' | 'popular';
  page?: number;
  limit?: number;
}
