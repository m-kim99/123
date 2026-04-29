/**
 * 이미지 파일을 PDF로 변환하는 유틸리티
 */

export function isImageFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return (
    file.type.startsWith('image/') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png')
  );
}

export async function convertImageToPdf(imageFile: File): Promise<File> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('이미지 데이터 읽기 오류'));
    };
    reader.onerror = () => reject(reader.error || new Error('이미지 읽기 오류'));
    reader.readAsDataURL(imageFile);
  });

  const lowerName = imageFile.name.toLowerCase();
  const isPng = imageFile.type === 'image/png' || lowerName.endsWith('.png');

  pdf.addImage(imgData, isPng ? 'PNG' : 'JPEG', 0, 0, pageWidth, pageHeight);

  const pdfBlob = pdf.output('blob');
  const baseName = imageFile.name.replace(/\.[^/.]+$/, '');
  const pdfFileName = `${baseName}.pdf`;

  return new File([pdfBlob], pdfFileName, { type: 'application/pdf' });
}
