import API from "./axios";

export function getAllApplications() {
  return API.get("/applications/");
}