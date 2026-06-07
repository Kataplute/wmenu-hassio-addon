import { useEffect, useRef } from "react";
import { api } from "../api.js";

// Synchronise un document applicatif (objet sérialisable) avec le backend,
// quand il est présent — sinon repli silencieux en local-only (GitHub Pages,
// hors-ligne). Stratégie « dernier écrivain gagne », adaptée à un usage
// familial séquentiel : écriture en write-through (debounce) et relecture au
// retour sur l'onglet pour récupérer les modifs d'un autre appareil.
//
//  key         clé du document côté serveur ("planner" | "recipes")
//  doc         document local courant (objet)
//  applyRemote (value) => void : applique un document distant à l'état local
export function useSyncedDoc(key, doc, applyRemote, { debounce = 700 } = {}) {
  const synced = useRef(false);
  const lastSync = useRef(null);        // updatedAt connu du serveur
  const skipNextWrite = useRef(false);  // évite de ré-écrire ce qu'on vient de lire
  const applyRef = useRef(applyRemote);
  applyRef.current = applyRemote;
  const docRef = useRef(doc);
  docRef.current = doc;

  // Chargement initial : le serveur fait foi s'il a une valeur ; sinon on
  // l'amorce avec le document local courant.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!(await api.healthy())) return; // local-only → rien à synchroniser
      try {
        const { value, updatedAt } = await api.state.get(key);
        if (cancelled) return;
        if (value != null) {
          skipNextWrite.current = true;
          lastSync.current = updatedAt;
          applyRef.current(value);
        } else {
          const r = await api.state.put(key, docRef.current); // amorce le serveur
          lastSync.current = r.updatedAt;
        }
        synced.current = true;
      } catch {
        // serveur indisponible en cours de route → on reste en local-only
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Write-through (debounce) des changements locaux. On dépend de l'identité du
  // document : les mises à jour d'état étant immuables, la référence ne change
  // que lorsqu'il change réellement → pas de JSON.stringify à chaque rendu.
  useEffect(() => {
    if (!synced.current) return;
    if (skipNextWrite.current) { skipNextWrite.current = false; return; }
    const t = setTimeout(async () => {
      try {
        const r = await api.state.put(key, docRef.current);
        lastSync.current = r.updatedAt;
      } catch {
        // ignore : le localStorage conserve la copie locale
      }
    }, debounce);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, key]);

  // Retour sur l'onglet : récupère une écriture faite depuis un autre appareil.
  useEffect(() => {
    const onFocus = async () => {
      if (!synced.current) return;
      try {
        const { value, updatedAt } = await api.state.get(key);
        if (value != null && updatedAt && updatedAt !== lastSync.current) {
          skipNextWrite.current = true;
          lastSync.current = updatedAt;
          applyRef.current(value);
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
