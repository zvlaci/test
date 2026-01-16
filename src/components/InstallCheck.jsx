//import { useEffect } from "react";
//import { useNavigate, useLocation } from "react-router-dom";
//import axios from "axios";

export default function InstallCheck({ children }) {
  /*
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkInstall = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL;
        if (!baseUrl) {
          console.warn("[InstallCheck] VITE_API_URL is missing sending to /install");
          if (location.pathname !== "/install") {
            navigate("/install");
          }
          return;
        }

        const res = await axios.get(`${baseUrl}/users/count`);
        //console.log("[InstallCheck] /users/count response:", res.data);

        // { count: 0 } or  0
        const count =
          typeof res.data === "number"
            ? res.data
            : res.data?.count ?? null;

        if ((count === 0 || count === "0") && location.pathname !== "/install") {
          console.log("[InstallCheck] No users found, redirecting to /install");
          navigate("/install");
        }
      } catch (err) {
        console.error("[InstallCheck] Error checking install:", err);

        // (network, 500, CORS etc.), redirect to /install
        if (location.pathname !== "/install") {
          navigate("/install");
        }
      }
    };

    checkInstall();
  }, [navigate, location.pathname]);
  */
 
  return children;
}
