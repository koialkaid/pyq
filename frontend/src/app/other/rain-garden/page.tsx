import type { Metadata } from "next";
import RainGardenClient from "./RainGardenClient";

export const metadata: Metadata = {
  title: "雨庭",
  description: "雨中的锦鲤水庭与相伴计时。",
};

export default function RainGardenPage() {
  return <RainGardenClient />;
}
