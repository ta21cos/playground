import {
  DndContext,
  type DragEndEvent,
  type CollisionDetection,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
} from "@dnd-kit/core";

const cardFirstCollision: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    const cardHit = pointerCollisions.find((c) =>
      String(c.id).startsWith("card:"),
    );
    if (cardHit) return [cardHit];
    return pointerCollisions;
  }
  return closestCenter(args);
};

interface DndProviderProps {
  children: React.ReactNode;
  onDragEnd: (event: DragEndEvent) => void;
}

export function DndProvider({ children, onDragEnd }: DndProviderProps) {
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={cardFirstCollision}
      onDragEnd={onDragEnd}
    >
      {children}
    </DndContext>
  );
}
