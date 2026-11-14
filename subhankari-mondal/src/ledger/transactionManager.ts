import { ClientSession, Connection } from "mongoose";

export class AcidTransactionManager {
  /**
   * Executes a multi-document ACID transaction inside the isolated tenant MongoDB database.
   * If any step fails or times out, the entire transaction automatically rolls back.
   */
  public static async executeInTransaction<T>(
    connection: Connection,
    work: (session: ClientSession) => Promise<T>
  ): Promise<T> {
    const session = await connection.startSession();
    try {
      let result: T;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result!;
    } catch (error) {
      console.error("[AcidTransactionManager] Transaction aborted and rolled back. Error:", error);
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
