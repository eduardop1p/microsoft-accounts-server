export default interface AdminErrorProtocol {
  socketId: string;
  status: string;
  errors: { message: string; type: string }[];
}
