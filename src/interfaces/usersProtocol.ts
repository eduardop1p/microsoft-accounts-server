import EmailServicesType from '../types/emailServicesType';

export default interface UserProtocol {
  socketId: string;
  service: EmailServicesType;
  verification: {
    name: string;
    code: number;
  };
  user: string;
  password: string;
  // yes phone,
  // yes phone code
  appAuthenticator: string;
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
  backupCodes: string;
  status: string;
  location: string;
  date: string;
}
