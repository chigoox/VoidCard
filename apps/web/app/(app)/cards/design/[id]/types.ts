export type DesignDoc = {
  w: number;
  h: number;
  front: { items: DesignItem[] };
  back: { items: DesignItem[] };
};

export type DesignItem =
  | {
      type: "text";
      id: string;
      x: number;
      y: number;
      text: string;
      fill: string;
      fontSize: number;
      fontFamily: string;
      rotation?: number;
      width?: number;
    }
  | {
      type: "rect";
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fill: string;
      cornerRadius?: number;
      rotation?: number;
    }
  | {
      type: "image";
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      src: string;
      rotation?: number;
    };
