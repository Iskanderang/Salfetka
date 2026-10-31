import type { Layout } from "@napkin/shared";
import { CLASSIC, type Renderer } from "./layouts";
import { MORE } from "./layoutsMore";

/** Все формы: классические и новые. */
export const RENDERERS: Record<Layout, Renderer> = { ...CLASSIC, ...MORE };

/** Формы, где заголовок встроен в саму схему. */
export const NO_HEADER: Layout[] = ["hierarchy", "mindmap", "hub"];
