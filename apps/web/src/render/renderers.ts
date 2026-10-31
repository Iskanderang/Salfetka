import type { Layout } from "@napkin/shared";
import { CLASSIC, type Renderer } from "./layouts";
import { MORE } from "./layoutsMore";
import { METAPHORS } from "./layoutsMetaphors";

/** Все формы: классические и новые. */
export const RENDERERS: Record<Layout, Renderer> = { ...CLASSIC, ...MORE, ...METAPHORS };

/** Формы, где заголовок встроен в саму схему. */
export const NO_HEADER: Layout[] = ["hierarchy", "mindmap", "hub", "fishbone"];
