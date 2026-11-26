export type Part = 'T' | 'B' | 'V';
export type Cls = 1 | 2 | 3;

export type Q = {
  id: string;
  cls: Cls;
  part: Part;
  path: string[];
  sectionId: string;
  q: string;
  a: [string, string, string, string];
  img?: string;
  aImg?: [string?, string?, string?, string?];
  calc: boolean;
};

export type TreeNode = {
  id: string;
  title: string;
  part: Part;
  children?: TreeNode[];
};
