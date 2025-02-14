/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './layouts/**/*.{html,js,ejs}',
    './pages/**/*.{html,js,ejs}',
    './scripts/**/*.{html,js,ts}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  purge: {
    content: [
      './layouts/**/*.{html,js,ejs}',
      './pages/**/*.{html,js,ejs}',
      './scripts/**/*.{html,js,ts}',
    ],
    options: {
      safelist: [],
    },
  },
};