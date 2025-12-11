import { useState, useMemo, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RotateCw,
  Printer,
  Download,
  Search,
  PanelLeftClose,
  PanelLeft,
  ZoomIn,
  ZoomOut,
  X,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface PdfViewerProps {
  url: string;
  onDownload?: () => void;
}

export function PdfViewer({ url, onDownload }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const handleDocumentLoadSuccess = ({ numPages: nextNumPages }: { numPages: number }) => {
    setNumPages(nextNumPages);
  };

  const pageNumbers = useMemo(() => {
    if (!numPages) return [];
    return Array.from({ length: numPages }, (_, i) => i + 1);
  }, [numPages]);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handlePrint = () => {
    const printWindow = window.open(url);
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = 'document.pdf';
      link.click();
    }
  };

  const scrollToPage = useCallback((pageNum: number) => {
    const pageElement = pageRefs.current.get(pageNum);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(pageNum);
    }
  }, []);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && numPages && value <= numPages) {
      scrollToPage(value);
    }
  };

  const handleScroll = useCallback(() => {
    if (!mainContentRef.current || !numPages) return;
    
    const container = mainContentRef.current;
    
    let closestPage = 1;
    let minDistance = Infinity;
    
    pageRefs.current.forEach((element, pageNum) => {
      const rect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const distance = Math.abs(rect.top - containerRect.top);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestPage = pageNum;
      }
    });
    
    if (closestPage !== currentPage) {
      setCurrentPage(closestPage);
    }
  }, [numPages, currentPage]);

  return (
    <div className="flex flex-col h-full">
      {/* 상단 툴바 */}
      <div className="flex items-center justify-between gap-1 sm:gap-2 border-b bg-slate-50 px-2 sm:px-3 py-2 text-xs sm:text-sm">
        {/* 왼쪽: 사이드바 토글 + 확대/축소 */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
            title="목차"
            className="p-1 sm:p-2"
          >
            {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
          
          <div className="hidden sm:block w-px h-5 bg-slate-300" />
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setScale((prev) => Math.max(0.5, prev - 0.1))}
            title="축소"
            className="p-1 sm:p-2"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-[45px] sm:min-w-[55px] text-center font-medium text-xs sm:text-sm">
            {Math.round(scale * 100)}%
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setScale((prev) => Math.min(2.5, prev + 0.1))}
            title="확대"
            className="p-1 sm:p-2"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* 중앙: 페이지 네비게이션 */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => scrollToPage(currentPage - 1)}
            className="p-1 sm:p-2"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 text-xs sm:text-sm">
            <Input
              type="number"
              min={1}
              max={numPages || 1}
              value={currentPage}
              onChange={handlePageInputChange}
              className="w-10 sm:w-12 h-7 text-center text-xs sm:text-sm p-1"
            />
            <span className="text-slate-500">/ {numPages || '...'}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!numPages || currentPage >= numPages}
            onClick={() => scrollToPage(currentPage + 1)}
            className="p-1 sm:p-2"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {/* 오른쪽: 회전, 검색, 인쇄, 다운로드 */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRotate}
            title="회전"
            className="p-1 sm:p-2"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            title="검색"
            className="p-1 sm:p-2"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            title="인쇄"
            className="hidden sm:flex p-1 sm:p-2"
          >
            <Printer className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownload}
            title="다운로드"
            className="p-1 sm:p-2"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 검색 바 */}
      {showSearch && (
        <div className="flex items-center gap-2 border-b bg-white px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="텍스트 검색..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="flex-1 h-8 text-sm"
            autoFocus
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowSearch(false);
              setSearchText('');
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 썸네일 사이드바 */}
        {showSidebar && (
          <div className="w-32 sm:w-40 border-r bg-slate-50 overflow-y-auto flex-shrink-0">
            <div className="p-2 border-b bg-white sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">목차</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSidebar(false)}
                  className="p-1 h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="p-2 space-y-2">
              <Document file={url} loading={null} error={null}>
                {pageNumbers.map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => scrollToPage(pageNum)}
                    className={`w-full p-1 rounded border-2 transition-all ${
                      currentPage === pageNum
                        ? 'border-slate-400 bg-white'
                        : 'border-transparent hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="bg-white shadow-sm overflow-hidden">
                      <Page
                        pageNumber={pageNum}
                        width={100}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </div>
                    <p className="text-xs text-center mt-1 text-slate-600">{pageNum}</p>
                  </button>
                ))}
              </Document>
            </div>
          </div>
        )}

        {/* PDF 본문 */}
        <div
          ref={mainContentRef}
          className="flex-1 overflow-auto bg-slate-100"
          onScroll={handleScroll}
        >
          <Document
            file={url}
            onLoadSuccess={handleDocumentLoadSuccess}
            loading={
              <div className="flex h-40 items-center justify-center px-4">
                <p className="text-slate-500 text-sm">PDF 문서를 불러오는 중입니다...</p>
              </div>
            }
            error={
              <div className="flex h-40 items-center justify-center px-4">
                <p className="text-red-500 text-sm">PDF 문서를 불러오지 못했습니다.</p>
              </div>
            }
            className="flex flex-col items-center py-4 gap-4"
          >
            {pageNumbers.map((pageNum) => (
              <div
                key={pageNum}
                ref={(el) => {
                  if (el) pageRefs.current.set(pageNum, el);
                }}
                className="shadow-lg bg-white relative"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <Page
                  pageNumber={pageNum}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {pageNum} / {numPages}
                </div>
              </div>
            ))}
          </Document>
        </div>
      </div>
    </div>
  );
}
