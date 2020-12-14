const tailwindcss = require("tailwindcss");
module.exports = {
  plugins: [
    require("postcss-import"),
    tailwindcss("./tailwind.js"),
    require("autoprefixer"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/aspect-ratio"),
  ],
};
