// Allow importing plain CSS files (global styles used in Next.js App Router)
declare module '*.css' {
  const content: string
  export default content
}
