import { logoutAction } from "@/app/actions";

export function LogoutForm() {
  return (
    <form action={logoutAction}>
      <button className="button danger" type="submit">
        Salir
      </button>
    </form>
  );
}
