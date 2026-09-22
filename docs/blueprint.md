# **App Name**: FinanceWise AI

## Core Features:

- Secure User Authentication: Implement secure authentication with Firebase Authentication, including role-based access control (admin and regular users).
- Financial Data Upload: Enable users to upload financial statements (Balance Sheet and Income Statement) via manual input, OCR from images, or Excel file upload. Data will be parsed and stored in Firestore.
- Automated Financial Analysis: Automatically generate financial analysis reports including vertical analysis, horizontal analysis, financial ratios, DuPont analysis, cash flow statement, and statement of source and application of funds.
- AI-Powered Report Generation: Use a generative AI tool to create insightful reports based on financial data, ratio analysis, and identified trends.
- Interactive Dashboards: Visualize financial data through interactive charts and graphs using libraries like Chart.js. Users can customize views and focus on specific metrics.
- Historical Analysis Tracking: Maintain a historical record of all analyses performed by users, searchable by company, date, and financial period.
- Data Export Functionality: Allow users to export analysis results in PDF (using ReportLab or Puppeteer) and Excel (using XLSX) formats for further use and sharing.

## Style Guidelines:

- Primary color: Deep blue (#2962FF) to convey trust and professionalism.
- Background color: Light blue (#E6F0FF), subtly desaturated, providing a clean, professional backdrop.
- Accent color: Green (#32CD32), analogous to blue, highlights positive financial indicators.
- Body and headline font: 'Inter' sans-serif for a clean and modern look.
- Use clear, minimalist icons to represent financial data and analysis types.
- Employ a clean, grid-based layout to present financial data in an organized and digestible manner.
- Use subtle transitions and animations to enhance user experience when loading data and navigating between analysis views.