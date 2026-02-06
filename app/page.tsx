"use client";

import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";

type MenuType = "all" | "exterior" | "interior";

export default function Home() {
  // 상태 관리
  const [currentSlide, setCurrentSlide] = useState(0);
  const [carouselImages, setCarouselImages] = useState<string[]>([]);
  const [displayedImages, setDisplayedImages] = useState<string[]>([]);
  const [allExteriorImages, setAllExteriorImages] = useState<string[]>([]);
  const [allInteriorImages, setAllInteriorImages] = useState<string[]>([]);
  const [activeMenu, setActiveMenu] = useState<MenuType>("all");
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Refs
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const isDragging = useRef(false);

  // 이미지 불러오기
  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      try {
        const [homeRes, exteriorRes, interiorRes] = await Promise.all([
          fetch("/api/images?type=home"),
          fetch("/api/images?type=exterior"),
          fetch("/api/images?type=interior"),
        ]);

        const homeData = await homeRes.json();
        const exteriorData = await exteriorRes.json();
        const interiorData = await interiorRes.json();

        setCarouselImages(homeData.images || []);
        setAllExteriorImages(exteriorData.images || []);
        setAllInteriorImages(interiorData.images || []);

        // 초기 갤러리 이미지 설정
        const allImages = [...exteriorData.images, ...interiorData.images];
        setDisplayedImages(allImages.slice(0, 8));
      } catch (error) {
        console.error("Failed to fetch images:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, []);

  // 캐러셀 자동 재생
  useEffect(() => {
    if (carouselImages.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [carouselImages.length]);

  // 캐러셀 드래그 기능
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    dragStartX.current = "touches" in e ? e.touches[0].clientX : e.clientX;
  };

  const handleDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging.current) return;

    const endX = "changedTouches" in e ? e.changedTouches[0].clientX : e.clientX;
    const diff = dragStartX.current - endX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // 왼쪽으로 드래그 - 다음 슬라이드
        setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
      } else {
        // 오른쪽으로 드래그 - 이전 슬라이드
        setCurrentSlide((prev) =>
          prev === 0 ? carouselImages.length - 1 : prev - 1
        );
      }
    }

    isDragging.current = false;
  };

  // 메뉴 필터링
  const handleMenuClick = (menu: MenuType) => {
    setActiveMenu(menu);
    setHasMore(true);

    let imagesToDisplay: string[] = [];
    if (menu === "exterior") {
      imagesToDisplay = allExteriorImages.slice(0, 8);
    } else if (menu === "interior") {
      imagesToDisplay = allInteriorImages.slice(0, 8);
    } else {
      imagesToDisplay = [...allExteriorImages, ...allInteriorImages].slice(0, 8);
    }

    setDisplayedImages(imagesToDisplay);
    setIsMobileMenuOpen(false);
  };

  // 무한 스크롤
  const loadMoreImages = useCallback(() => {
    setIsLoadingMore(true);

    setTimeout(() => {
      const currentLength = displayedImages.length;
      let sourceImages: string[] = [];

      if (activeMenu === "exterior") {
        sourceImages = allExteriorImages;
      } else if (activeMenu === "interior") {
        sourceImages = allInteriorImages;
      } else {
        sourceImages = [...allExteriorImages, ...allInteriorImages];
      }

      const nextImages = sourceImages.slice(currentLength, currentLength + 6);

      if (nextImages.length === 0) {
        setHasMore(false);
      } else {
        setDisplayedImages((prev) => [...prev, ...nextImages]);
      }

      setIsLoadingMore(false);
    }, 500);
  }, [displayedImages.length, activeMenu, allExteriorImages, allInteriorImages]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMoreImages();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMoreImages, hasMore, isLoadingMore]);

  // 로딩 화면
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">
              HORIZON
            </h1>
            <p className="text-sm sm:text-base font-light tracking-[0.3em] text-zinc-500 dark:text-zinc-400 uppercase">
              Architecture
            </p>
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 sm:gap-4">
              <Image
                src="/images/logo/logo.png"
                alt="Horizon Logo"
                width={40}
                height={40}
                className="h-8 sm:h-10 w-auto"
                priority
              />
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white leading-none">
                  HORIZON
                </span>
                <span className="text-[10px] sm:text-xs font-light tracking-[0.2em] text-zinc-500 dark:text-zinc-400 uppercase mt-0.5">
                  Architecture
                </span>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex gap-8 text-sm font-medium">
              <button
                onClick={() => handleMenuClick("all")}
                className={`relative pb-1 transition-colors ${
                  activeMenu === "all"
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                CONTACT
                {activeMenu === "all" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 dark:bg-white"></span>
                )}
              </button>
              <button
                onClick={() => handleMenuClick("exterior")}
                className={`relative pb-1 transition-colors ${
                  activeMenu === "exterior"
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                EXTERIOR
                {activeMenu === "exterior" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 dark:bg-white"></span>
                )}
              </button>
              <button
                onClick={() => handleMenuClick("interior")}
                className={`relative pb-1 transition-colors ${
                  activeMenu === "interior"
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                INTERIOR
                {activeMenu === "interior" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 dark:bg-white"></span>
                )}
              </button>
            </div>

            {/* Mobile Hamburger */}
            <button
              className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <div className="w-6 h-5 flex flex-col justify-between">
                <span
                  className={`block h-0.5 w-full bg-zinc-900 dark:bg-white transition-transform ${
                    isMobileMenuOpen ? "rotate-45 translate-y-2" : ""
                  }`}
                ></span>
                <span
                  className={`block h-0.5 w-full bg-zinc-900 dark:bg-white transition-opacity ${
                    isMobileMenuOpen ? "opacity-0" : ""
                  }`}
                ></span>
                <span
                  className={`block h-0.5 w-full bg-zinc-900 dark:bg-white transition-transform ${
                    isMobileMenuOpen ? "-rotate-45 -translate-y-2" : ""
                  }`}
                ></span>
              </div>
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col gap-4 text-sm font-medium">
                <button
                  onClick={() => handleMenuClick("all")}
                  className={`text-left px-4 py-2 transition-colors ${
                    activeMenu === "all"
                      ? "text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  CONTACT
                </button>
                <button
                  onClick={() => handleMenuClick("exterior")}
                  className={`text-left px-4 py-2 transition-colors ${
                    activeMenu === "exterior"
                      ? "text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  EXTERIOR
                </button>
                <button
                  onClick={() => handleMenuClick("interior")}
                  className={`text-left px-4 py-2 transition-colors ${
                    activeMenu === "interior"
                      ? "text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  INTERIOR
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Carousel */}
      <section
        ref={carouselRef}
        className="relative w-full mt-16 sm:mt-20 h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] cursor-grab active:cursor-grabbing overflow-hidden"
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
      >
        {carouselImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={image}
              alt={`Slide ${index + 1}`}
              fill
              className="object-cover object-center pointer-events-none"
              priority={index === 0}
              quality={90}
              sizes="100vw"
            />
          </div>
        ))}

        {/* Carousel Indicators */}
        <div className="absolute bottom-6 sm:bottom-12 left-1/2 transform -translate-x-1/2 flex gap-2 sm:gap-3 z-10">
          {carouselImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "bg-white scale-125"
                  : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Gallery with Infinite Scroll */}
      <section id="gallery" className="py-8 sm:py-12 lg:py-16 px-3 sm:px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
            {displayedImages.map((image, index) => (
              <div
                key={index}
                className="relative w-full pb-[100%] overflow-hidden rounded-md sm:rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 group"
              >
                <Image
                  src={image}
                  alt={`Gallery image ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </div>
            ))}
          </div>

          {/* Infinite Scroll Trigger */}
          {hasMore && (
            <div
              ref={loadMoreRef}
              className="flex justify-center items-center py-6 sm:py-8 lg:py-12"
            >
              <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 border-b-2 border-zinc-900 dark:border-white"></div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
