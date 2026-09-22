# Persistencia de parcelas

TecRural Campo usa una persistencia híbrida:

1. **Nube:** los datos de la parcela se guardan en la base de datos del servidor (`campo.parcelas`). No se guardan únicamente en `localStorage`.
2. **Dispositivo anónimo:** si la persona no tiene cuenta, cada parcela queda asociada al identificador de una cookie HttpOnly firmada (`tecrural_sesion`). Ese identificador permite recuperar las parcelas después de recargar o volver a entrar desde el mismo navegador/dispositivo.
3. **Cuenta de usuario:** al aceptar una invitación y activar una cuenta en ese mismo dispositivo, las parcelas anónimas se vinculan al `userId`. Desde entonces se recuperan por la cuenta y pueden estar disponibles en otros dispositivos autenticados.
4. **Aislamiento:** las consultas y borrados comprueban la cookie de dispositivo o el `userId`; no se debe aceptar el identificador enviado por el cliente como prueba de propiedad.

La eliminación se realiza desde el botón **Eliminar** de cada tarjeta y borra la parcela y sus evaluaciones asociadas. La eliminación de la cuenta también elimina sus parcelas y suscripciones de avisos.

Si se borran las cookies del dispositivo antes de activar una cuenta, una parcela anónima puede dejar de ser recuperable desde ese navegador. Por eso se recomienda activar la cuenta si se necesita acceso desde varios dispositivos.
