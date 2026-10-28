import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { QueryMessage } from "../components/QueryMessage";
import { PlantRecord } from "../components/PlantRecord";
import { plantQuery } from "../lib/api";
export function PlantDetails() {
  const { id = "" } = useParams(),
    plant = useQuery(plantQuery(id));
  if (plant.isPending) return <QueryMessage loading />;
  if (plant.error)
    return (
      <QueryMessage error={plant.error} retry={() => void plant.refetch()} />
    );
  return (
    <>
      <section className="lab-heading">
        <div>
          <p className="eyebrow">A living record</p>
          <h1>{plant.data.name}</h1>
          <p>Every plant has a story. Follow its traits back to their roots.</p>
        </div>
        <Link className="button-link secondary" to="/gallery">
          Back to collection →
        </Link>
      </section>
      <PlantRecord plant={plant.data} />
    </>
  );
}
