import type { Metadata } from "next";
import { VERSION_CONSENTIMIENTO } from "@/lib/privacidad/consentimiento";
import { EMAIL_CONTACTO } from "@/lib/config/contacto";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Información sobre el tratamiento de datos personales en TecRural Campo.",
};

export default function PrivacidadPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <header className="rounded-2xl border-2 border-stone-900 bg-white p-5">
        <h1 className="text-2xl font-extrabold text-stone-900">Política de privacidad</h1>
        <p className="mt-1 text-sm text-stone-600">Última actualización: 23 de septiembre de 2026 · Versión {VERSION_CONSENTIMIENTO}</p>
      </header>

      <section className="rounded-2xl border-2 border-stone-200 bg-white p-5 text-sm leading-relaxed text-stone-700">
        <p>
          Esta política describe el tratamiento de datos en la experiencia pública de TecRural Campo: consulta del tiempo por municipio, selección de cultivo y solicitud de avisos gratuitos por WhatsApp. La consulta meteorológica no requiere crear una cuenta. Cuando se envía el formulario de avisos, se crea una parcela y una suscripción vinculadas al dispositivo utilizado. Se aplica conforme al Reglamento (UE) 2016/679 (RGPD), la Ley Orgánica 3/2018 (LOPDGDD), la Ley 34/2002 (LSSI-CE) y demás normativa aplicable.
        </p>
        <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 font-semibold text-amber-950">
          La casilla de avisos por WhatsApp permite activar el servicio solicitado. La casilla de comunicaciones comerciales es independiente, opcional y revocable; no es necesaria para recibir avisos agrícolas.
        </p>

        <h2 className="mt-5 text-base font-bold text-stone-900">1. Responsable del tratamiento</h2>
        <p className="mt-1">Responsable: <strong>Manuel Carrasco García</strong>. NIF: <strong>76143911L</strong>. Domicilio: <strong>Barrio Los Reyes, 113. 18830 Huéscar (Granada)</strong>. Correo de contacto: <a className="font-semibold underline" href={`mailto:${EMAIL_CONTACTO}`}>{EMAIL_CONTACTO}</a>.</p>

        <h2 className="mt-5 text-base font-bold text-stone-900">2. Datos tratados</h2>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Si solicitas avisos: nombre, teléfono/WhatsApp, municipio y cultivo. El número se usa como destino de los avisos que has pedido.</li>
          <li>Para asociar la previsión y los avisos a tu zona: coordenadas del municipio seleccionado, cultivo y nombre de la parcela generado a partir del municipio.</li>
          <li>Identificador seudónimo del dispositivo y cookie técnica de sesión firmada, que permiten vincular la parcela y la suscripción a este navegador. La portada no exige crear una cuenta.</li>
          <li>Datos técnicos y de uso necesarios para prestar y proteger el servicio, como dirección IP, fecha, hora, eventos de navegación y registros de errores.</li>
        </ul>

        <h2 className="mt-5 text-base font-bold text-stone-900">3. Finalidades y bases jurídicas</h2>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Responder a la consulta meteorológica de la zona seleccionada: prestación de la función solicitada, artículo 6.1.b RGPD.</li>
          <li>Crear la parcela y activar los avisos agrícolas que pides al enviar el formulario: ejecución de la solicitud, artículo 6.1.b RGPD; el envío de avisos al teléfono indicado se basa además en tu consentimiento explícito, artículo 6.1.a RGPD.</li>
          <li>Gestionar la solicitud de contacto y comunicarte sobre el alta: medidas precontractuales o prestación del servicio solicitado, artículo 6.1.b RGPD.</li>
          <li>Enviar comunicaciones comerciales: solo si marcas la casilla opcional, sobre la base de tu consentimiento, artículo 6.1.a RGPD y artículo 21 LSSI-CE. Puedes retirarlo en cualquier momento.</li>
          <li>Prevenir abusos, investigar errores y proteger el servicio: interés legítimo del responsable, artículo 6.1.f RGPD, limitado a lo necesario para seguridad y funcionamiento.</li>
        </ul>

        <h2 className="mt-5 text-base font-bold text-stone-900">4. Coordenadas y datos de localización</h2>
        <p className="mt-1">Al seleccionar un municipio, las coordenadas asociadas se usan en el servidor para consultar y calcular el tiempo y, si activas avisos, para crear la parcela de referencia de la suscripción. No solicitamos la ubicación GPS del dispositivo ni mostramos las coordenadas como perfil público. La selección se guarda en el almacenamiento local del navegador y la parcela y suscripción quedan vinculadas al identificador seudónimo de ese dispositivo. Puedes pedir su eliminación o desactivación escribiendo al correo indicado en esta política.</p>

        <h2 className="mt-5 text-base font-bold text-stone-900">5. Destinatarios y proveedores</h2>
        <p className="mt-1">Los datos se comunican únicamente cuando hace falta para prestar el servicio: proveedores de alojamiento y base de datos para operar y guardar la aplicación; AEMET y Open-Meteo para obtener datos meteorológicos de la zona; WhatsApp/Meta para entregar los avisos al teléfono indicado; y Telegram para notificar al equipo las solicitudes de contacto. La web también utiliza Vercel Analytics para métricas de uso. Estos proveedores tratan los datos conforme a sus funciones y condiciones. Las fuentes meteorológicas reciben las coordenadas necesarias para resolver la previsión.</p>

        <h2 className="mt-5 text-base font-bold text-stone-900">6. WhatsApp y transferencias internacionales</h2>
        <p className="mt-1">Si activas avisos, tu número y el contenido de los mensajes necesarios para el servicio se procesan mediante WhatsApp/Meta, que actúa conforme a sus propias condiciones y política de privacidad. No incluyas información sensible en el canal. Puede haber tratamiento fuera del Espacio Económico Europeo; en esos casos se aplicarán las garantías exigidas por el capítulo V del RGPD.</p>

        <h2 className="mt-5 text-base font-bold text-stone-900">7. Conservación</h2>
        <p className="mt-1">Los datos de contacto se conservan mientras sea necesario atender la solicitud y realizar el seguimiento relacionado. La parcela, las coordenadas y la suscripción se conservan mientras el servicio esté activo; puedes pedir su desactivación y eliminación. La evidencia del consentimiento puede conservarse mientras sea necesaria para demostrarlo o atender responsabilidades legales. Los registros técnicos se conservan durante el tiempo necesario para seguridad, diagnóstico y cumplimiento de obligaciones. Cuando dejan de ser necesarios, se eliminan o se anonimizan, salvo los datos que deban bloquearse por obligación legal.</p>

        <h2 className="mt-5 text-base font-bold text-stone-900">8. Derechos</h2>
        <p className="mt-1">Puedes solicitar acceso, rectificación, supresión, oposición, limitación y portabilidad, así como retirar el consentimiento o pedir que se desactive la suscripción, escribiendo a <a className="font-semibold underline" href={`mailto:${EMAIL_CONTACTO}`}>{EMAIL_CONTACTO}</a> desde el teléfono o correo de contacto asociado. La retirada no afecta a la licitud del tratamiento anterior. Puedes reclamar ante la Agencia Española de Protección de Datos (AEPD), <a className="font-semibold underline" href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es</a>.</p>

        <h2 className="mt-5 text-base font-bold text-stone-900">9. Decisiones automatizadas</h2>
        <p className="mt-1">El servicio puede comparar previsiones meteorológicas con umbrales orientativos del cultivo seleccionado y generar automáticamente avisos de helada o viento. El sistema no determina decisiones con efectos jurídicos sobre ti. Las estimaciones pueden no reflejar las condiciones concretas de la parcela y no sustituyen a AEMET ni al criterio de un técnico agrícola.</p>

        <h2 className="mt-5 text-base font-bold text-stone-900">10. Cookies y almacenamiento local</h2>
        <p className="mt-1">La web guarda en el almacenamiento local el identificador seudónimo del dispositivo, el municipio elegido y el cultivo para recordar tu selección y vincular la suscripción. Utiliza además una cookie de sesión técnica, protegida y necesaria para reconocer ese dispositivo en las peticiones al servidor; la cookie tiene una duración máxima de un año. Si borras los datos del sitio o cambias de navegador/dispositivo, puede perderse la asociación local; puedes volver a solicitar la vinculación desde el formulario. Puedes borrar el almacenamiento desde la configuración del navegador.</p>

        <h2 className="mt-5 text-base font-bold text-stone-900">11. Seguridad</h2>
        <p className="mt-1">Se aplican medidas técnicas y organizativas razonables, como control de acceso, sesiones protegidas, minimización, copias y registro de incidencias. Ningún sistema conectado a Internet garantiza riesgo cero. Las brechas que puedan implicar riesgo para las personas se gestionarán conforme al artículo 33 RGPD.</p>

        <h2 className="mt-5 text-base font-bold text-stone-900">12. Cambios</h2>
        <p className="mt-1">La política podrá actualizarse por cambios legales, técnicos o del servicio. La versión aplicable será la publicada en esta página y, cuando sea necesario, se solicitará un nuevo consentimiento.</p>
      </section>
    </div>
  );
}
