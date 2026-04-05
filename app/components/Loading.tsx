export default function LoadingSpinner({ message = 'กำลังโหลด...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg font-medium">{message}</p>
      </div>
    </div>
  );
}

export function LoadingCard({ message = 'กำลังโหลด...' }: { message?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

export function LoadingButton() {
  return (
    <div className="flex items-center justify-center space-x-2">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      <span>กำลังบันทึก...</span>
    </div>
  );
}
