export interface RenderContext {
  id: string;
  root: string;
  href(url: string): string;
  anchor(name: string): string;
  file(path: string): string | undefined;
}

export interface DiagramType<T> {
  schema: object;
  check(data: T): string[];
  render(data: T, context: RenderContext): string;
}
