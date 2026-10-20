import { Route, Routes } from "react-router-dom";
import { FillPage } from "./routes/FillPage.tsx";
import { HomePage } from "./routes/HomePage.tsx";
import { NotFoundPage } from "./routes/NotFoundPage.tsx";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/f/:slug" element={<FillPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
