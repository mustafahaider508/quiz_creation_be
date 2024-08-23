import prisma from "../../../config/db.js";

const findUser = (email) => {
  return prisma.user.findUnique({
    where: {
      email,
    },
  });
};

const createUser = ({ firstName, surname, email, passwordHash }) => {
  return prisma.user.create({
    data: {
      firstName,
      surname,
      email,
      password: passwordHash,
    },
  });
};

//Update Password
const updatePassword = (email, password) => {
  return prisma.user.update({
    where: {
      email,
    },
    data: {
      password,
    },
  });
};

const service = {
  findUser,
  createUser,
  updatePassword,
};

export default service;
