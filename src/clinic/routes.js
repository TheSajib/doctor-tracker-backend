import { Router } from "express";
import { asyncHandler } from "../async-handler.js";
import {
  createDoctor,
  createPatient,
  deletePatient,
  getDashboard,
  getDoctor,
  listDoctors,
  listPatients,
  updatePatient,
} from "./service.js";

export function clinicRoutes() {
  const router = Router();

  router.get(
    "/doctors",
    asyncHandler(async (req, res) => {
      res.json(await listDoctors(req.query));
    }),
  );
  router.post(
    "/doctors",
    asyncHandler(async (req, res) => {
      res.status(201).json(await createDoctor(req.body));
    }),
  );
  router.get(
    "/doctors/:id",
    asyncHandler(async (req, res) => {
      res.json(await getDoctor(req.params.id));
    }),
  );

  router.get(
    "/patients",
    asyncHandler(async (req, res) => {
      res.json(await listPatients(req.query));
    }),
  );
  router.post(
    "/patients",
    asyncHandler(async (req, res) => {
      res.status(201).json(await createPatient(req.body));
    }),
  );
  router.patch(
    "/patients/:id",
    asyncHandler(async (req, res) => {
      res.json(await updatePatient(req.params.id, req.body));
    }),
  );
  router.delete(
    "/patients/:id",
    asyncHandler(async (req, res) => {
      await deletePatient(req.params.id);
      res.status(204).end();
    }),
  );

  router.get(
    "/dashboard",
    asyncHandler(async (_req, res) => {
      res.json(await getDashboard());
    }),
  );

  return router;
}
