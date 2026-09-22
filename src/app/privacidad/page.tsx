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
        <p className="mt-1 text-sm text-stone-600">Última actualización: 22 de septiembre de 2026 · Versión {VERSION_CONSENTIMIENTO}</p>
      </header>

      <section className="rounded-2xl border-2 border-stone-200 bg-white p-5 text-sm leading-relaxed text-stone-700">
        <p>
          Esta política informa sobre cómo TecRural Campo trata los datos personales de las personas que visitan la web, crean una parcela, solicitan información o utilizan sus servicios. Se aplica conforme al Reglamento (UE) 2016/679 (RGPD), la Ley Orgánica 3/2018 (LOPDGDD), la Ley 34/2002 (LSSI-CE) y demás normativa española aplicable.
        </p>
        <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 font-semibold text-amber-950">
          Esta política explica el tratamiento de datos de TecRural Campo. Las comunicaciones comerciales requieren un consentimiento separado, opcional y revocable.
        </p>

        <h2 className="mt-5 text-base font-bold text-stone-900">1. Responsable del tratamiento</h2>
        <p className="mt-1">Responsable: <strong>Manuel Carrasco García</strong>. NIF: <strong>76143911L</strong>. Domicilio: <strong>Barrio Los Reyes, 113. 18830 Huéscar (Granada)</strong>. Correo de contacto: <a className="font-semibold underline" href={`mailto:${EMAIL_CONTACTO}`}>{EMAIL_CONTACTO}</a>.</p>

        <h2 className="mt-5 text-base font-bold text-stone-900">2. Datos tratados</h2>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Datos identificativos y de contacto: nombre, teléfono, correo electrónico y, cuando proceda, número o conversación de WhatsApp.</li>
          <li>Datos de explotación: municipio, provincia, coordenadas de la parcela, nombre de la parcela, cultivos y preferencias de avisos.</li>
          <li>Datos técnicos: identificadores de dispositivo, sesión, dirección IP, fecha, hora, navegador y registros necesarios para seguridad y funcionamiento.</li>
          <li>Datos de uso y eventos de navegación, únicamente en la medida permitida por la configuración de analítica y las preferencias aplicables.</li>
        </ul>

        <h2 className="mt-5 text-base font-bold text-stone-900">3. Finalidades y bases jurídicas</h2>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Prestar el servicio de ubicación, previsión y alertas para la parcela y el cultivo: ejecución de la solicitud o contrato, artículo 6.1.b RGPD.</li>
          <li>Gestionar la cuenta, parcelas, preferencias, exportación y supresión de datos: ejecución del contrato y cumplimiento de obligaciones legales, artículos 6.1.b y 6.1.c RGPD.</li>
          <li>Atender consultas y solicitudes de contacto: medidas precontractuales o consentimiento, artículo 6.1.b o 6.1.a RGPD según el caso.</li>
          <li>Enviar comunicaciones comerciales por medios electrónicos: consentimiento previo, específico e inequívoco, artículo 6.1.a RGPD y artículo 21 LSSI-CE, salvo las excepciones legales aplicables a clientes y servicios similares. El consentimiento es revocable.</li>
          <li>Prevenir fraude, abusos, incidentes y mantener la seguridad: interés legítimo del responsable, artículo 6.1.f RGPD, aplicando ponderación y minimización.</li>
          <li>Analítica no necesaria: solo con el consentimiento que corresponda. La mera navegación no debe interpretarse como consentimiento.</li>
        </ul>

        <h2 className="mt-5 text-base font-bold text-stone-900">4. Coordenadas y datos de localización</h2>
        <p className="mt-1">Las coordenadas se utilizan para calcular previsiones y alertas de la parcela. No se publican como perfil público. Debes facilitar únicamente la precisión necesaria para el servicio. Puedes solicitar la supresión de la parcela o de la cuenta.</p>

        <h2 className="mt-5 text-base font-bold text-stone-900">5. Destinatarios y proveedores</h2>
        <p className="mt-1">Pueden acceder a los datos proveedores que prestan servicios de alojamiento, base de datos, correo, analítica, mensajería, seguridad y soporte, siempre bajo contrato o base jurídica adecuada y con las instrucciones del responsable. Entre las fuentes externas usadas para ofrecer información se encuentran AEMET, RAIF y proveedores meteorológicos. Debe mantenerse un registro actualizado de proveedores, ubicaciones de tratamiento, subencargados y garantías.</p>

        <h2 className="mt-5 text-base font-bold text-stone-900">6. WhatsApp y transferencias internacionales</h2>
        <p className="mt-1">Si eliges contactar o recibir comunicaciones por WhatsApp, el tratamiento también queda sujeto a la política de privacidad y condiciones de WhatsApp/Meta. TecRural no debe enviar datos sensibles o innecesarios por ese canal. Cuando un proveedor esté fuera del Espacio Económico Europeo, se aplicarán las garantías del capítulo V RGPD, como decisión de adecuación, cláusulas contractuales tipo y medidas complementarias cuando proceda.</p>

        <h2 className="mt-5 text-base font-bold text-stone-900">7. Conservación</h2>
        <p className="mt-1">Los datos se conservarán mientras exista la relación o mientras sean necesarios para la finalidad. Después se bloquearán durante los plazos necesarios para atender responsabilidades legales y, transcurridos estos, se eliminarán o anonimizarán. Como criterio operativo pendiente de confirmar legalmente: solicitudes de contacto hasta 24 meses desde la última interacción; cuenta y parcelas mientras estén activas y hasta 3 años desde su cierre; consentimientos mientras puedan ser necesarios como prueba y durante los plazos legales; registros técnicos durante el plazo estrictamente necesario para seguridad.</p>

        <h2 className="mt-5 text-base font-bold text-stone-900">8. Derechos</h2>
        <p className="mt-1">Puedes solicitar acceso, rectificación, supresión, oposición, limitación y portabilidad, así como retirar un consentimiento en cualquier momento, escribiendo a <a className="font-semibold underline" href={`mailto:${EMAIL_CONTACTO}`}>{EMAIL_CONTACTO}</a>. La retirada no afecta a la licitud del tratamiento anterior. Puedes reclamar ante la Agencia Española de Protección de Datos (AEPD), <a className="font-semibold underline" href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es</a>.</p>

        <h2 className="mt-5 text-base font-bold text-stone-900">9. Decisiones automatizadas</h2>
        <p className="mt-1">TecRural puede generar estimaciones y clasificaciones de riesgo mediante reglas y datos meteorológicos. No se adoptan decisiones con efectos jurídicos o similares sobre la persona. Las alertas son orientativas y no sustituyen a AEMET, RAIF ni a un técnico agrícola.</p>

        <h2 className="mt-5 text-base font-bold text-stone-900">10. Cookies y almacenamiento local</h2>
        <p className="mt-1">La aplicación puede utilizar cookies técnicas de sesión y almacenamiento local del navegador para recordar ubicación, preferencias y funcionamiento. Las cookies no necesarias, si se activan, deben estar sujetas a un panel de consentimiento previo conforme a la LSSI-CE y a la guía de cookies de la AEPD. Puedes borrar el almacenamiento desde la configuración del navegador.</p>

        <h2 className="mt-5 text-base font-bold text-stone-900">11. Seguridad</h2>
        <p className="mt-1">Se aplican medidas técnicas y organizativas razonables, como control de acceso, sesiones protegidas, minimización, copias y registro de incidencias. Ningún sistema conectado a Internet garantiza riesgo cero. Las brechas que puedan implicar riesgo para las personas se gestionarán conforme al artículo 33 RGPD.</p>

        <h2 className="mt-5 text-base font-bold text-stone-900">12. Cambios</h2>
        <p className="mt-1">La política podrá actualizarse por cambios legales, técnicos o del servicio. La versión aplicable será la publicada en esta página y, cuando sea necesario, se solicitará un nuevo consentimiento.</p>
      </section>
    </div>
  );
}
