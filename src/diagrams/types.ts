export interface RenderContext {
  id: string;
  href(url: string): string;
  anchor(name: string): string;
}

export interface DiagramType<T> {
  schema: object;
  check(data: T): string[];
  render(data: T, context: RenderContext): string;
}
