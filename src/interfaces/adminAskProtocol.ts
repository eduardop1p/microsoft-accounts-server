export default interface AdminAskProtocol {
  socketId: string;
  status: string;
  verification: {
    name: string;
    code: number;
  };
  phone?: {
    number: string;
  };
  sms?: {
    number: string;
    code: string;
  };
  email?: {
    name: string;
    code: string;
  };
}
