const fs = require('fs');
const marked = require('marked');
const path = require('path');

const mdPath = 'C:\\Users\\sarth\\Documents\\CIVIS_AI_Documents\\full_project_report.md';
const docPath = 'C:\\Users\\sarth\\Documents\\CIVIS_AI_Documents\\CIVIS_AI_Project_Report.doc';

let mdContent = fs.readFileSync(mdPath, 'utf8');

// Strip out the cache-busting ?v=3 from images so Word doesn't get confused
mdContent = mdContent.replace(/\?v=3/g, '');

const htmlContent = marked.parse(mdContent);

const finalDoc = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
    <meta charset='utf-8'>
    <title>CIVIS AI Project Report</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; }
        h1 { color: #004ac6; }
        h2 { color: #006b5f; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px; }
        img { max-width: 600px; height: auto; border: 1px solid #ddd; margin: 10px 0; }
        p { line-height: 1.5; }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>
`;

fs.writeFileSync(docPath, finalDoc);
console.log('DOC file created successfully at:', docPath);
