module.exports = {
  // Quét toàn bộ thư mục gốc
  input: [
    './**/*.{js,jsx,ts,tsx}', 
    '!**/node_modules/**', // Loại trừ thư mục node_modules
    '!**/.next/**',        // Loại trừ thư mục build của Next.js
    '!**/public/**',       // Loại trừ folder ảnh/assets
    '!**/dist/**',         // Loại trừ folder build
  ],
  
  locales: ['en', 'vi'],
  output: 'public/locales/$LOCALE/$NAMESPACE.json', 
  keepRemoved: true,
  sort: true,
  keySeparator: '.',
  namespaceSeparator: ':',
};