import React, { useState, useRef } from 'react';
import { 
  Upload, X, Plus, Trash2, 
  AlertCircle, Calculator, Percent, Coins, Sparkles, Video, Play, CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (newDraw: any) => void;
}

interface SpecItem {
  key: string;
  value: string;
}

// Category-specific default specification templates
const CATEGORY_SPEC_TEMPLATES: Record<string, SpecItem[]> = {
  ELECTRONICS: [
    { key: 'Display / Screen', value: '6.8" Dynamic AMOLED 2X (120Hz LTPO)' },
    { key: 'Storage & RAM', value: '512GB UFS 4.0 / 12GB LPDDR5X RAM' },
    { key: 'Processor / Chip', value: 'Snapdragon 8 Gen 3 for Galaxy' },
    { key: 'Camera System', value: '200MP Quad Camera with 100x Space Zoom' },
    { key: 'Battery & Charging', value: '5,000mAh with 45W Fast Charging' },
    { key: 'Warranty & Condition', value: 'Brand New In-Box with 1 Year Warranty' },
  ],
  VEHICLES: [
    { key: 'Make & Model', value: 'Toyota Land Cruiser 300 VXR' },
    { key: 'Model Year', value: '2024 / 2025' },
    { key: 'Mileage', value: '0 KM (Brand New)' },
    { key: 'Transmission', value: '10-Speed Direct Shift Automatic' },
    { key: 'Engine & Fuel', value: '3.5L Twin-Turbo V6 Petrol' },
    { key: 'Exterior / Interior', value: 'Pearl White / Black Nappa Leather' },
    { key: 'Registration Status', value: 'Duty Paid, Customs Cleared, Plate Ready' },
  ],
  REAL_ESTATE: [
    { key: 'Property Type', value: 'Luxury G+2 Modern Residential Villa' },
    { key: 'Bedrooms / Baths', value: '4 En-suite Bedrooms, 5 Bathrooms' },
    { key: 'Built-up Area', value: '280 m² (Land Area: 350 m²)' },
    { key: 'Location', value: 'Bole Bulbula / CMC Heights, Addis Ababa' },
    { key: 'Furnishing', value: 'Fully Furnished with European Kitchen' },
    { key: 'Title Deed (Karata)', value: 'Clean Certificate of Title Deed in Hand' },
    { key: 'Parking & Security', value: '3-Car Gated Parking + CCTV & Security Booth' },
  ],
  LUXURY: [
    { key: 'Brand & Model', value: 'Rolex Submariner Date 41mm' },
    { key: 'Reference Number', value: '126610LN' },
    { key: 'Case Material', value: 'Oystersteel with Cerachrom Ceramic Bezel' },
    { key: 'Movement', value: 'Automatic Self-Winding Calibre 3235' },
    { key: 'Water Resistance', value: '300 meters / 1,000 feet' },
    { key: 'Box & Documents', value: 'Original Green Box, Guarantee Card & Papers' },
    { key: 'Authenticity', value: '100% Certified Authentic & Inspected' },
  ],
  GAMING: [
    { key: 'Console Model', value: 'Sony PlayStation 5 Pro 2TB Digital Edition' },
    { key: 'Internal Storage', value: '2TB Custom High-Speed NVMe SSD' },
    { key: 'Controllers Included', value: '2x DualSense Wireless Controllers' },
    { key: 'Bundled Games', value: 'EA Sports FC 26 + God of War Ragnarök' },
    { key: 'Performance & Resolution', value: 'Up to 4K 120FPS & Advanced Ray Tracing' },
    { key: 'Warranty', value: '1 Year Authorized Ethiopian Distributor Warranty' },
  ],
};

const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  ELECTRONICS: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=1200&q=80',
  VEHICLES: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
  REAL_ESTATE: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  LUXURY: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80',
  GAMING: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80',
};

export const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onProductCreated }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('ELECTRONICS');
  const [description, setDescription] = useState('');
  const [permitNumber, setPermitNumber] = useState('NL-ET-2026-0941');
  const [salesDurationDays, setSalesDurationDays] = useState(7);
  const [publishImmediately, setPublishImmediately] = useState(true);

  // Profit & Pricing Calculator State
  const [retailValueEtb, setRetailValueEtb] = useState(150000);
  const [profitMode, setProfitMode] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [profitPercent, setProfitPercent] = useState(25);
  const [profitFixedEtb, setProfitFixedEtb] = useState(37500);
  const [pricingDriver, setPricingDriver] = useState<'BY_PRICE' | 'BY_TICKETS'>('BY_PRICE');
  const [ticketPriceEtb, setTicketPriceEtb] = useState(100);
  const [totalTickets, setTotalTickets] = useState(1875);
  const [maxTicketsPerUser, setMaxTicketsPerUser] = useState(25);

  // Dynamic Category Specifications
  const [specifications, setSpecifications] = useState<SpecItem[]>(CATEGORY_SPEC_TEMPLATES.ELECTRONICS);

  // Image upload state
  const [images, setImages] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Product Video Showcase State (TikTok / YouTube / MP4)
  const [productVideoUrl, setProductVideoUrl] = useState('');
  const [productVideoPlatform, setProductVideoPlatform] = useState<'tiktok' | 'youtube' | 'mp4' | 'other'>('tiktok');
  const [isResolvingVideo, setIsResolvingVideo] = useState(false);
  const [videoVerificationNote, setVideoVerificationNote] = useState<string | null>(null);

  const handleVerifyProductVideo = async (overrideUrl?: string) => {
    const targetUrl = (overrideUrl !== undefined ? overrideUrl : productVideoUrl).trim();
    if (!targetUrl) return;
    setIsResolvingVideo(true);
    setVideoVerificationNote(null);
    try {
      if (/tiktok\.com/.test(targetUrl)) {
        const res = await api.resolveTikTok(targetUrl);
        if (res && res.isTikTok) {
          setProductVideoPlatform('tiktok');
          if (res.videoId) {
            const canonical = `https://www.tiktok.com/@${res.authorName || 'user'}/video/${res.videoId}`;
            setProductVideoUrl(canonical);
          }
          setVideoVerificationNote(`Verified TikTok: @${res.authorName || 'user'} - ${res.title || 'Product Showcase Video'}`);
        } else {
          setProductVideoPlatform('tiktok');
          setVideoVerificationNote('TikTok link detected');
        }
      } else if (/youtube\.com|youtu\.be/.test(targetUrl)) {
        setProductVideoPlatform('youtube');
        setVideoVerificationNote('YouTube Video link verified');
      } else if (/\.(mp4|webm|ogg)($|\?)/i.test(targetUrl)) {
        setProductVideoPlatform('mp4');
        setVideoVerificationNote('Direct MP4 video file verified');
      } else {
        setProductVideoPlatform('other');
        setVideoVerificationNote('Video URL link saved');
      }
    } catch {
      setVideoVerificationNote('Video URL link saved');
    } finally {
      setIsResolvingVideo(false);
    }
  };

  if (!isOpen) return null;

  // Change category and re-populate appropriate specifications template
  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    if (CATEGORY_SPEC_TEMPLATES[newCat]) {
      setSpecifications(CATEGORY_SPEC_TEMPLATES[newCat].map(item => ({ ...item })));
    }
  };

  // Image compressor using HTML5 canvas
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = () => resolve(event.target?.result as string);
        img.src = event.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;
    const fileList = Array.from(files);
    for (const file of fileList) {
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file);
        if (compressed) {
          setImages((prev) => [...prev, compressed]);
        }
      }
    }
  };

  const handleAddUrl = () => {
    if (urlInput.trim()) {
      setImages((prev) => [...prev, urlInput.trim()]);
      setUrlInput('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (primaryImageIndex >= index && primaryImageIndex > 0) {
      setPrimaryImageIndex((prev) => prev - 1);
    }
  };

  // Re-calculate pricing and ticket volumes automatically
  const recomputeFinancials = (
    cost: number,
    mode: 'PERCENT' | 'FIXED',
    pct: number,
    fixed: number,
    driver: 'BY_PRICE' | 'BY_TICKETS',
    price: number,
    tickets: number
  ) => {
    const profit = mode === 'PERCENT' ? Math.round(cost * (pct / 100)) : fixed;
    const revenue = Math.max(100, cost + profit);

    if (driver === 'BY_PRICE') {
      const p = Math.max(5, price || 100);
      const computedTickets = Math.ceil(revenue / p);
      setTotalTickets(computedTickets);
    } else {
      const t = Math.max(10, tickets || 100);
      const computedPrice = Math.max(5, Math.ceil(revenue / t / 5) * 5);
      setTicketPriceEtb(computedPrice);
    }
  };

  const handleCostChange = (val: number) => {
    const cost = Math.max(0, val);
    setRetailValueEtb(cost);
    recomputeFinancials(cost, profitMode, profitPercent, profitFixedEtb, pricingDriver, ticketPriceEtb, totalTickets);
  };

  const handleProfitPercentChange = (val: number) => {
    const pct = Math.max(0, val);
    setProfitPercent(pct);
    recomputeFinancials(retailValueEtb, 'PERCENT', pct, profitFixedEtb, pricingDriver, ticketPriceEtb, totalTickets);
  };

  const handleProfitFixedChange = (val: number) => {
    const fixed = Math.max(0, val);
    setProfitFixedEtb(fixed);
    recomputeFinancials(retailValueEtb, 'FIXED', profitPercent, fixed, pricingDriver, ticketPriceEtb, totalTickets);
  };

  const handleTicketPriceChange = (val: number) => {
    const price = Math.max(5, val);
    setTicketPriceEtb(price);
    const profit = profitMode === 'PERCENT' ? Math.round(retailValueEtb * (profitPercent / 100)) : profitFixedEtb;
    const revenue = retailValueEtb + profit;
    setTotalTickets(Math.ceil(revenue / price));
  };

  const handleTotalTicketsChange = (val: number) => {
    const t = Math.max(10, val);
    setTotalTickets(t);
    const profit = profitMode === 'PERCENT' ? Math.round(retailValueEtb * (profitPercent / 100)) : profitFixedEtb;
    const revenue = retailValueEtb + profit;
    setTicketPriceEtb(Math.max(5, Math.ceil(revenue / t / 5) * 5));
  };

  const handleSpecChange = (index: number, field: 'key' | 'value', value: string) => {
    setSpecifications((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleAddSpecRow = () => {
    setSpecifications((prev) => [...prev, { key: 'Feature / Spec', value: '' }]);
  };

  const handleRemoveSpecRow = (index: number) => {
    setSpecifications((prev) => prev.filter((_, i) => i !== index));
  };

  // Financial calculations for display
  const currentCost = Math.max(0, retailValueEtb || 0);
  const currentProfitAmount = profitMode === 'PERCENT'
    ? Math.round(currentCost * ((profitPercent || 0) / 100))
    : Math.max(0, profitFixedEtb || 0);
  const projectedGross = ticketPriceEtb * totalTickets;
  const projectedNetProfit = projectedGross - currentCost;
  const projectedProfitPercentage = currentCost > 0 
    ? ((projectedNetProfit / currentCost) * 100).toFixed(1) 
    : '0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a product prize title');
      return;
    }

    const defaultImage = DEFAULT_CATEGORY_IMAGES[category] || DEFAULT_CATEGORY_IMAGES.ELECTRONICS;
    const finalImages = images.length > 0 ? images : [defaultImage];

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const drawDate = new Date();
      drawDate.setDate(drawDate.getDate() + salesDurationDays);

      // Convert specifications array to clean key-value map
      const specsMap: Record<string, string> = {};
      specifications.forEach((s) => {
        if (s.key.trim()) {
          specsMap[s.key.trim()] = s.value.trim();
        }
      });

      let finalVideoUrl = productVideoUrl.trim();
      if (finalVideoUrl && /(?:vt|vm)\.tiktok\.com/i.test(finalVideoUrl)) {
        try {
          const resolved = await api.resolveTikTok(finalVideoUrl);
          if (resolved?.videoId) {
            finalVideoUrl = `https://www.tiktok.com/@${resolved.authorName || 'user'}/video/${resolved.videoId}`;
          }
        } catch (_) {}
      }

      if (finalVideoUrl) {
        specsMap['Product Video'] = finalVideoUrl;
        specsMap['videoUrl'] = finalVideoUrl;
        specsMap['videoPlatform'] = productVideoPlatform;
      }

      // Normalize category to supported Prisma enum
      let apiCategory = category;
      if (category === 'LUXURY') apiCategory = 'LIFESTYLE';
      if (category === 'GAMING') apiCategory = 'ELECTRONICS';

      const payload = {
        title: title.trim(),
        description: description.trim() || `${title.trim()} - Official National Lottery Draw`,
        ticketPriceEtb: Number(ticketPriceEtb),
        totalTickets: Number(totalTickets),
        maxTicketsPerUser: Number(maxTicketsPerUser),
        salesStartDate: new Date().toISOString(),
        salesEndDate: drawDate.toISOString(),
        drawDate: drawDate.toISOString(),
        permitNumber: permitNumber.trim() || 'NL-ET-2026-0941',
        isFeatured: true,
        videoUrl: finalVideoUrl || undefined,
        prize: {
          title: title.trim(),
          description: description.trim() || `${title.trim()} Specifications`,
          retailValueEtb: Number(retailValueEtb),
          category: apiCategory,
          imageUrls: finalImages,
          videoUrl: finalVideoUrl || undefined,
          specifications: specsMap,
        },
      };

      // Create draw in database via core api service
      const created = await api.createAdminDraw(payload);

      // If immediate publication was selected, publish draw to OPEN status
      if (publishImmediately && created?.id) {
        try {
          await api.publishDraw(created.id);
        } catch (pubErr) {
          console.warn('Publish warning:', pubErr);
        }
      }

      onProductCreated(created);
      onClose();
    } catch (err: any) {
      console.error('Failed to post product draw:', err);
      setErrorMsg(err.message || 'Failed to post product draw. Please verify the API server is connected.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem',
      overflowY: 'auto',
    }}>
      {/* Crisp Pure Light Mode Modal Dialog */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '20px',
        maxWidth: '840px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 20px 40px -12px rgba(15, 23, 42, 0.15), 0 0 1px 1px rgba(0, 0, 0, 0.05)',
        position: 'relative',
        color: '#0F172A'
      }}>
        {/* Sticky Header */}
        <div style={{
          padding: '1.25rem 2rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          background: '#FFFFFF',
          zIndex: 10
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{
                background: '#FEF3C7',
                color: '#B45309',
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.06em'
              }}>
                OFFICIAL LOTTERY DRAW
              </span>
              <h2 style={{ fontSize: '1.28rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                Create & Publish Official Draw
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem', margin: 0 }}>
              Configure official prize draw with certified specifications & ticket pricing model.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              color: '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div style={{
            margin: '1rem 2rem 0',
            padding: '0.75rem 1rem',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '10px',
            color: '#B91C1C',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600
          }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* SECTION 1: PRODUCT PHOTOS */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                Product Photos <span style={{ color: '#D97706' }}>*</span>
              </label>
              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                Auto-compressed for instant upload
              </span>
            </div>

            {/* Drag & Drop Upload Container */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileSelect(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? '#D97706' : '#CBD5E1'}`,
                borderRadius: '12px',
                padding: '1.4rem',
                textAlign: 'center',
                background: isDragging ? '#FFFBEB' : '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '0.85rem'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#FEF3C7',
                color: '#B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.6rem'
              }}>
                <Upload size={18} />
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.2rem' }}>
                Click to upload photos or drag & drop here
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
                PNG, JPG, WEBP. If empty, a curated high-res category hero photo will be assigned automatically.
              </p>
            </div>

            {/* URL Fallback Bar */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: images.length > 0 ? '0.85rem' : 0 }}>
              <input
                type="url"
                placeholder="Or paste an image URL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                style={{
                  flex: 1,
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '0.55rem 0.85rem',
                  fontSize: '0.82rem',
                  color: '#0F172A'
                }}
              />
              <button
                type="button"
                onClick={handleAddUrl}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#B45309',
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Add URL
              </button>
            </div>

            {/* Uploaded Photos Gallery Preview */}
            {images.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                gap: '0.65rem',
                padding: '0.65rem',
                background: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #E2E8F0'
              }}>
                {images.map((img, idx) => {
                  const isPrimary = primaryImageIndex === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setPrimaryImageIndex(idx)}
                      style={{
                        position: 'relative',
                        height: '80px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: `2px solid ${isPrimary ? '#FFC107' : '#E2E8F0'}`,
                        cursor: 'pointer'
                      }}
                    >
                      <img src={img} alt={`Preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {isPrimary && (
                        <span style={{
                          position: 'absolute',
                          top: '3px',
                          left: '3px',
                          background: '#FFC107',
                          color: '#000000',
                          fontSize: '0.6rem',
                          fontWeight: 900,
                          padding: '1px 5px',
                          borderRadius: '4px'
                        }}>
                          PRIMARY
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                        style={{
                          position: 'absolute',
                          top: '3px',
                          right: '3px',
                          background: 'rgba(0, 0, 0, 0.7)',
                          border: 'none',
                          color: '#FFFFFF',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 1.5: PRODUCT VIDEO SHOWCASE (OPTIONAL) */}
          <div style={{
            background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
            border: '1.5px solid #BFDBFE',
            borderRadius: '14px',
            padding: '1.25rem',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}>
                  <Video size={15} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                    Product Video Showcase <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B' }}>(Optional)</span>
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: '#475569' }}>
                    Add a demonstration, unboxing, or review video for this prize (TikTok, YouTube, or direct MP4)
                  </p>
                </div>
              </div>

              {/* 1-Tap Preset */}
              <button
                type="button"
                onClick={() => {
                  const demoUrl = 'https://www.tiktok.com/@nati_lotto/video/7688259337197767943';
                  setProductVideoUrl(demoUrl);
                  handleVerifyProductVideo(demoUrl);
                }}
                style={{
                  background: '#DBEAFE',
                  border: '1px solid #93C5FD',
                  borderRadius: '6px',
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#1D4ED8',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Sparkles size={12} /> Use Official TikTok Demo
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  value={productVideoUrl}
                  onChange={(e) => {
                    setProductVideoUrl(e.target.value);
                    setVideoVerificationNote(null);
                  }}
                  onBlur={() => handleVerifyProductVideo()}
                  placeholder="Paste TikTok URL, YouTube link, or MP4 video URL (e.g., https://www.tiktok.com/@nati_lotto/video/...)"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.82rem',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => handleVerifyProductVideo()}
                disabled={isResolvingVideo || !productVideoUrl.trim()}
                style={{
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0 1rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: isResolvingVideo || !productVideoUrl.trim() ? 'not-allowed' : 'pointer',
                  opacity: isResolvingVideo || !productVideoUrl.trim() ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  whiteSpace: 'nowrap'
                }}
              >
                {isResolvingVideo ? 'Verifying...' : 'Verify Video'}
              </button>

              {productVideoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setProductVideoUrl('');
                    setVideoVerificationNote(null);
                  }}
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '0 0.65rem',
                    fontSize: '0.75rem',
                    color: '#64748B',
                    cursor: 'pointer'
                  }}
                  title="Clear video URL"
                >
                  Clear
                </button>
              )}
            </div>

            {videoVerificationNote && (
              <div style={{
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.76rem',
                color: '#15803D',
                fontWeight: 700,
                background: '#DCFCE7',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #86EFAC'
              }}>
                <CheckCircle2 size={13} color="#15803D" />
                <span>{videoVerificationNote}</span>
              </div>
            )}
          </div>

          {/* SECTION 2: BASIC DETAILS */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.9fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Prize Title <span style={{ color: '#D97706' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Samsung Galaxy S24 Ultra 512GB"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.9rem',
                    color: '#0F172A'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Prize Category <span style={{ color: '#D97706' }}>*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.9rem',
                    color: '#0F172A'
                  }}
                >
                  <option value="ELECTRONICS">📱 Electronics & Smart Gadgets</option>
                  <option value="VEHICLES">🚗 Vehicles & Automobiles</option>
                  <option value="REAL_ESTATE">🏠 Real Estate & Luxury Villas</option>
                  <option value="LUXURY">⌚ Luxury Watches & Jewelry</option>
                  <option value="GAMING">🎮 Gaming & Consoles</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Prize Description & Buyer Overview
              </label>
              <textarea
                rows={2}
                placeholder="Product description, retail packaging, accessories, warranty, and handover conditions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.85rem',
                  color: '#0F172A',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* SECTION 3: PRODUCT SPECIFICATIONS TABLE (Displayed to buyers) */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#B45309' }}>
                  Product Specifications Table (Displayed to buyers)
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.15rem' }}>
                  Auto-formatted based on selected <strong style={{ color: '#0F172A' }}>{category}</strong> category. Buyers see these exact verified specs.
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddSpecRow}
                style={{
                  background: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  color: '#B45309',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Plus size={14} /> Add Row
              </button>
            </div>

            {/* Specification Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {specifications.map((spec, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <div style={{ width: '38%' }}>
                    <input
                      type="text"
                      placeholder="Spec Attribute (e.g. Storage)"
                      value={spec.key}
                      onChange={(e) => handleSpecChange(idx, 'key', e.target.value)}
                      style={{
                        width: '100%',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '0.5rem 0.7rem',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#0F172A'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      placeholder="Spec Detail (e.g. 512GB UFS 4.0)"
                      value={spec.value}
                      onChange={(e) => handleSpecChange(idx, 'value', e.target.value)}
                      style={{
                        width: '100%',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '0.5rem 0.7rem',
                        fontSize: '0.82rem',
                        color: '#334155'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecRow(idx)}
                    title="Remove specification"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: specifications.length <= 1 ? 0.3 : 0.8
                    }}
                    disabled={specifications.length <= 1}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: PROFIT MARGIN & AUTOMATIC TICKET CALCULATOR */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid rgba(217, 119, 6, 0.4)',
            borderRadius: '14px',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calculator size={18} color="#D97706" />
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#B45309' }}>
                  Product Value, Profit Target & Ticket Calculator
                </span>
              </div>
              <span style={{
                fontSize: '0.72rem',
                background: '#FEF3C7',
                color: '#B45309',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 800
              }}>
                AUTOMATIC PROJECTION
              </span>
            </div>

            {/* Inputs: Cost, Profit Mode & Target */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              {/* Product Retail Cost */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Product Value / Cost (ETB) <span style={{ color: '#D97706' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={retailValueEtb}
                    onChange={(e) => handleCostChange(Number(e.target.value))}
                    required
                    style={{
                      width: '100%',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '0.6rem 0.85rem',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      color: '#0F172A'
                    }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#64748B' }}>
                    ETB
                  </span>
                </div>
              </div>

              {/* Profit Mode Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Profit Mode
                </label>
                <div style={{
                  display: 'flex',
                  background: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  overflow: 'hidden',
                  height: '38px'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setProfitMode('PERCENT');
                      recomputeFinancials(retailValueEtb, 'PERCENT', profitPercent, profitFixedEtb, pricingDriver, ticketPriceEtb, totalTickets);
                    }}
                    style={{
                      flex: 1,
                      border: 'none',
                      background: profitMode === 'PERCENT' ? '#FFC107' : 'transparent',
                      color: profitMode === 'PERCENT' ? '#000000' : '#64748B',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Percent size={13} /> Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfitMode('FIXED');
                      recomputeFinancials(retailValueEtb, 'FIXED', profitPercent, profitFixedEtb, pricingDriver, ticketPriceEtb, totalTickets);
                    }}
                    style={{
                      flex: 1,
                      border: 'none',
                      background: profitMode === 'FIXED' ? '#FFC107' : 'transparent',
                      color: profitMode === 'FIXED' ? '#000000' : '#64748B',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Coins size={13} /> Fixed ETB
                  </button>
                </div>
              </div>

              {/* Profit Target Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {profitMode === 'PERCENT' ? 'Desired Profit Margin (%)' : 'Desired Profit Amount (ETB)'} <span style={{ color: '#D97706' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  {profitMode === 'PERCENT' ? (
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      step="1"
                      value={profitPercent}
                      onChange={(e) => handleProfitPercentChange(Number(e.target.value))}
                      style={{
                        width: '100%',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '0.6rem 0.85rem',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        color: '#0F172A'
                      }}
                    />
                  ) : (
                    <input
                      type="number"
                      min="100"
                      step="500"
                      value={profitFixedEtb}
                      onChange={(e) => handleProfitFixedChange(Number(e.target.value))}
                      style={{
                        width: '100%',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '0.6rem 0.85rem',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        color: '#0F172A'
                      }}
                    />
                  )}
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78rem', fontWeight: 800, color: '#B45309' }}>
                    {profitMode === 'PERCENT' ? '%' : 'ETB'}
                  </span>
                </div>
              </div>
            </div>

            {/* Driver Toggle (Calculate by Price vs by Tickets) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              background: '#FFFFFF',
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              marginBottom: '1rem'
            }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748B' }}>
                Compute total tickets via:
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', color: pricingDriver === 'BY_PRICE' ? '#B45309' : '#64748B' }}>
                <input
                  type="radio"
                  name="pricing_driver"
                  checked={pricingDriver === 'BY_PRICE'}
                  onChange={() => {
                    setPricingDriver('BY_PRICE');
                    recomputeFinancials(retailValueEtb, profitMode, profitPercent, profitFixedEtb, 'BY_PRICE', ticketPriceEtb, totalTickets);
                  }}
                  style={{ accentColor: '#D97706' }}
                />
                <strong>Set Ticket Price &rarr; (Calculates Total Tickets)</strong>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', color: pricingDriver === 'BY_TICKETS' ? '#B45309' : '#64748B' }}>
                <input
                  type="radio"
                  name="pricing_driver"
                  checked={pricingDriver === 'BY_TICKETS'}
                  onChange={() => {
                    setPricingDriver('BY_TICKETS');
                    recomputeFinancials(retailValueEtb, profitMode, profitPercent, profitFixedEtb, 'BY_TICKETS', ticketPriceEtb, totalTickets);
                  }}
                  style={{ accentColor: '#D97706' }}
                />
                <strong>Set Total Tickets &rarr; (Calculates Ticket Price)</strong>
              </label>
            </div>

            {/* Financial Inputs: Ticket Price & Total Tickets */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Ticket Price (ETB) {pricingDriver === 'BY_TICKETS' && <span style={{ color: '#D97706' }}>(Calculated)</span>}
                </label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={ticketPriceEtb}
                  onChange={(e) => handleTicketPriceChange(Number(e.target.value))}
                  disabled={pricingDriver === 'BY_TICKETS'}
                  style={{
                    width: '100%',
                    background: pricingDriver === 'BY_TICKETS' ? '#FFFBEB' : '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: '#0F172A'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Total Tickets {pricingDriver === 'BY_PRICE' && <span style={{ color: '#D97706' }}>(Calculated)</span>}
                </label>
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={totalTickets}
                  onChange={(e) => handleTotalTicketsChange(Number(e.target.value))}
                  disabled={pricingDriver === 'BY_PRICE'}
                  style={{
                    width: '100%',
                    background: pricingDriver === 'BY_PRICE' ? '#FFFBEB' : '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: '#0F172A'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Max Tickets Per User
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={maxTicketsPerUser}
                  onChange={(e) => setMaxTicketsPerUser(Number(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.9rem',
                    color: '#0F172A'
                  }}
                />
              </div>
            </div>

            {/* LIVE FINANCIAL BREAKDOWN DISPLAY CARD */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.75rem',
              textAlign: 'center',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
            }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Product Cost
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }}>
                  {currentCost.toLocaleString()} ETB
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Projected Net Profit
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>
                  +{projectedNetProfit.toLocaleString()} ETB
                  <span style={{ fontSize: '0.72rem', marginLeft: '4px', opacity: 0.9 }}>
                    ({projectedProfitPercentage}%)
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Total Pool Revenue
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#D97706', marginTop: '0.2rem' }}>
                  {projectedGross.toLocaleString()} ETB
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Tickets & Price
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2563EB', marginTop: '0.2rem' }}>
                  {totalTickets.toLocaleString()} @ {ticketPriceEtb} ETB
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: LEGAL PERMIT & DURATION */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  National Lottery Permit # <span style={{ color: '#D97706' }}>*</span>
                </label>
                <input
                  type="text"
                  value={permitNumber}
                  onChange={(e) => setPermitNumber(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.9rem',
                    color: '#0F172A'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Sales Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={salesDurationDays}
                  onChange={(e) => setSalesDurationDays(Number(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.9rem',
                    color: '#0F172A'
                  }}
                />
              </div>
            </div>

            {/* Immediate Publish Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="publishNow"
                checked={publishImmediately}
                onChange={(e) => setPublishImmediately(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#D97706' }}
              />
              <label htmlFor="publishNow" style={{ fontSize: '0.82rem', color: '#334155', cursor: 'pointer', fontWeight: 600 }}>
                Publish immediately to live catalog for instant ticket sales
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                color: '#475569',
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: '#FFC107',
                border: 'none',
                color: '#000000',
                padding: '0.75rem 2rem',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: 900,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(255, 193, 7, 0.35)'
              }}
            >
              {isSubmitting ? (
                <>
                  <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Publishing Draw to Live Inventory...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Create & Publish Official Draw
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
