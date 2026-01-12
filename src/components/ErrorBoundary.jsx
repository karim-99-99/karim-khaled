import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-300 rounded bg-red-50 m-4">
          <h3 className="text-red-800 font-bold mb-2">
            {this.props.isArabic ? 'حدث خطأ في المحرر' : 'Editor Error'}
          </h3>
          <p className="text-red-600 text-sm mb-4">
            {this.props.isArabic 
              ? 'حدث خطأ في تحميل محرر المعادلات. استخدم مربع النص أدناه.' 
              : 'An error occurred loading the equation editor. Please use the text box below.'}
          </p>
          <details className="text-xs text-red-500 mb-4">
            <summary className="cursor-pointer">{this.props.isArabic ? 'تفاصيل الخطأ' : 'Error Details'}</summary>
            <pre className="mt-2 p-2 bg-red-100 rounded overflow-auto">
              {this.state.error?.toString()}
              {this.state.error?.stack}
            </pre>
          </details>
          <textarea
            value={this.props.value || ''}
            onChange={(e) => this.props.onChange && this.props.onChange(e.target.value)}
            placeholder={this.props.placeholder || (this.props.isArabic ? 'اكتب هنا...' : 'Write here...')}
            className="w-full p-2 border border-red-300 rounded min-h-[300px]"
            dir={this.props.isArabic ? 'rtl' : 'ltr'}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
