import { useState, useEffect } from "react";
import type { PlantDto } from "@botanica/shared";
import { useGame, useGameAction, ActionFeedback } from "../lib/game";
export function PlantGameActions({ plant: p }: { plant: PlantDto }) {
  const action = useGameAction(),
    game = useGame(),
    [confirm, setConfirm] = useState(false),
    [favorite, setFavorite] = useState(!!p.isFavorite),
    [protectedPlant, setProtected] = useState(!!p.isProtected);
  useEffect(() => {
    setFavorite(!!p.isFavorite);
    setProtected(!!p.isProtected);
  }, [p.id, p.isFavorite, p.isProtected]);
  function flags(nextFavorite: boolean, nextProtected: boolean) {
    setFavorite(nextFavorite);
    setProtected(nextProtected);
    action.mutate(
      {
        action: "flags",
        data: {
          plantId: p.id,
          favorite: nextFavorite,
          protected: nextProtected,
        },
      },
      {
        onError: () => {
          setFavorite(!!p.isFavorite);
          setProtected(!!p.isProtected);
        },
      },
    );
  }
  if (!p.gameEligible)
    return (
      <p className="study-notice">
        Laboratory study · saved for art and genetics, outside the game economy.
      </p>
    );
  const blocked =
    favorite || protectedPlant || p.rarity.tier === "Mythic" || p.soldAt;
  return (
    <div className="plant-economy-actions">
      <h3>Your specimen</h3>
      <label className="check-label">
        <input
          type="checkbox"
          checked={favorite}
          disabled={action.isPending || !!p.soldAt || game.pendingWork}
          onChange={(e) => flags(e.target.checked, protectedPlant)}
        />
        Favorite
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={protectedPlant}
          disabled={action.isPending || !!p.soldAt || game.pendingWork}
          onChange={(e) => flags(favorite, e.target.checked)}
        />
        Protect from sale
      </label>
      <button
        className="secondary"
        disabled={!!blocked || action.isPending || game.pendingWork}
        onClick={() => setConfirm(true)}
      >
        {p.soldAt
          ? "Sold · lineage preserved"
          : p.rarity.tier === "Mythic"
            ? "Mythic keepsake · cannot sell"
            : favorite || protectedPlant
              ? "Protected from sale"
              : `Sell specimen · ${p.saleCoins} coins…`}
      </button>
      {confirm && !p.soldAt && (
        <div className="sale-confirm">
          <p>
            Sell {p.name}? It will leave your inventory; its ancestry record
            remains. The server calculates the coin value from its species and
            traits.
          </p>
          <button
            disabled={action.isPending}
            onClick={() =>
              action.mutate(
                { action: "sell", data: { plantId: p.id } },
                { onSuccess: () => setConfirm(false) },
              )
            }
          >
            Confirm sale
          </button>{" "}
          <button className="secondary" onClick={() => setConfirm(false)}>
            Keep plant
          </button>
        </div>
      )}
      <ActionFeedback action={action} />
    </div>
  );
}
