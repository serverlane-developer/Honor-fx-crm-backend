import jwt from "jsonwebtoken";
import config from "../config";

const getAdminJwtToken = (user_id: string, email: string, username: string, is_2fa_enabled: boolean) => {
  const token = jwt.sign(
    {
      id: user_id,
      email,
      name: username,
      type: "admin",
      is_2fa_enabled,
    },
    config.JWT_SECRET,
    {
      expiresIn: parseInt(config.JWT_EXPIRY),
    }
  );
  const data = {
    email,
    username,
    user_id,
  };
  return { token, data };
};

const getCustomerJwtToken = (user_id: string, phone_number: string, username: string, is_2fa_enabled: boolean) => {
  const token = jwt.sign(
    {
      id: user_id,
      phone_number,
      name: username,
      type: "customer",
      is_2fa_enabled,
    },
    config.JWT_SECRET,
    {
      expiresIn: parseInt(config.JWT_EXPIRY),
    }
  );
  const data = {
    phone_number,
    username,
    user_id,
  };
  return { token, data };
};

export { getAdminJwtToken, getCustomerJwtToken };
