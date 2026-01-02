export class ResponseTaskDto {
  id: number;
  name: string;
  description: string;
  completed: boolean;
  createdAt: Date | null;
  userId: number | null;
}
