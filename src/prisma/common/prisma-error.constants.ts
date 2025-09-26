/**
 * Prisma error codes for `PrismaClientKnownRequestError`.
 * @see https://www.prisma.io/docs/reference/api-reference/error-reference#prisma-client-query-engine
 */
export const PrismaError = {
  /**
   * An operation failed because it depends on one or more records that were required but not found.
   * (Record to update/delete does not exist.)
   */
  RecordNotFound: 'P2025',
} as const;
