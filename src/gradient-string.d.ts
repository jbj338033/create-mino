declare module "gradient-string" {
  interface Gradient {
    passion: {
      multiline(text: string): string;
    };
  }
  const gradient: Gradient;
  export default gradient;
}
