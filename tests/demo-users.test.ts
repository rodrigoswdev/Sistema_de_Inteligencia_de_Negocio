import { describe, expect, it } from "vitest";
import {
  createUser,
  findDemoUser,
  listUsers,
  updateUser,
} from "@/lib/repositories/users";

describe("usuarios en modo demostración", () => {
  it("conserva el usuario creado para la tabla y el inicio de sesión", async () => {
    const email = `usuario-${crypto.randomUUID()}@cbn.local`;
    const created = await createUser({
      name: "Usuario de prueba",
      email,
      password: "Temporal123",
      roles: ["VENTAS"],
    });

    const listed = await listUsers();
    const loginUser = await findDemoUser(email);

    expect(listed).toContainEqual(
      expect.objectContaining({
        id: created.id,
        email,
        roles: ["VENTAS"],
        active: true,
      }),
    );
    expect(loginUser).toEqual(
      expect.objectContaining({
        id: created.id,
        password: "Temporal123",
      }),
    );

    await updateUser(created.id, { state: "INACTIVO" });
    expect(await findDemoUser(email)).toEqual(
      expect.objectContaining({ active: false }),
    );
  });

  it("rechaza correos duplicados", async () => {
    await expect(
      createUser({
        name: "Otra administradora",
        email: "admin@cbn.local",
        password: "Temporal123",
        roles: ["ADMINISTRADOR"],
      }),
    ).rejects.toThrow("Ya existe un usuario");
  });
});
