import React from 'react';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by App ErrorBoundary:', error, errorInfo);
    }
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-dark-600 mb-4">حدث خطأ</h2>
            <p className="text-dark-600 mb-6">
              عذراً، حدث خطأ غير متوقع. يرجى إعادة تحميل الصفحة.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left text-sm bg-gray-100 p-4 rounded mb-4 max-h-48 overflow-auto">
                <summary className="cursor-pointer font-bold mb-2">تفاصيل الخطأ</summary>
                <pre className="mt-2 text-xs whitespace-pre-wrap">{this.state.error.toString()}</pre>
                {this.state.errorInfo && (
                  <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition"
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
