// fit-leads fork: Spanish, branded sign-in code email. Tables and inline
// styles because Gmail and Outlook drop <style> blocks and flexbox.
const magicCodeEmail = `
doctype html
html(lang="es")
    head
        meta(charset="utf-8")
        meta(name="viewport" content="width=device-width, initial-scale=1")
        meta(name="color-scheme" content="light only")
        title Tu código para entrar
    body(style="margin:0;padding:0;background-color:#f2f0eb;")
        div(style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f2f0eb;") Caduca en 5 minutos. No lo compartas con nadie.
        table(role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2f0eb;")
            tr
                td(align="center" style="padding:32px 16px;")
                    table(role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background-color:#ffffff;border:1px solid #e4e1da;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0b0c0e;")
                        tr
                            td(style="background-color:#0b0c0e;padding:18px 24px;")
                                span(style="display:inline-block;background-color:#d7f94c;color:#0b0c0e;font-weight:800;font-size:13px;line-height:1;padding:7px 8px;border-radius:7px;vertical-align:middle;") FL
                                span(style="display:inline-block;color:#f2f0eb;font-size:15px;font-weight:600;padding-left:10px;vertical-align:middle;") #{siteName}
                        tr
                            td(style="padding:32px 24px 8px;")
                                h1(style="margin:0 0 10px;font-size:22px;line-height:1.25;font-weight:700;color:#0b0c0e;") Tu código para entrar
                                p(style="margin:0;font-size:15px;line-height:1.55;color:#3d3f44;")
                                    | Escríbelo en la pantalla de acceso
                                    if siteName
                                        |  de #{siteName}
                                    |  para continuar.
                        tr
                            td(style="padding:20px 24px;")
                                table(role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0")
                                    tr
                                        td(align="center" style="background-color:#0b0c0e;border-radius:12px;padding:20px 12px;font-family:'SF Mono',Menlo,Consolas,'Courier New',monospace;font-size:34px;line-height:1;font-weight:700;letter-spacing:8px;color:#d7f94c;") #{code}
                                p(style="margin:12px 0 0;font-size:13px;line-height:1.5;color:#6b6d72;text-align:center;") Caduca en 5 minutos y solo sirve una vez.
                        tr
                            td(style="padding:8px 24px 28px;")
                                p(style="margin:0;padding:14px 16px;background-color:#f7f6f2;border-left:3px solid #d7f94c;border-radius:6px;font-size:13px;line-height:1.55;color:#3d3f44;")
                                    strong No lo compartas con nadie:
                                    |  quien tenga este código puede entrar en tu cuenta. Si no lo has pedido tú, ignora este correo.
                        if !hideCourseLitBranding
                            tr
                                td(align="center" style="padding:0 24px 24px;")
                                    a(href="https://courselit.app" target="_blank" style="text-decoration:none;color:#6b6d72;font-size:12px;") Powered by <strong>CourseLit</strong>
                    p(style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#8a8c91;") Recibes este correo porque alguien pidió entrar con tu email.
`;

export const magicCodeSubject = (code: string, siteName?: string | null) =>
    siteName
        ? `${code} es tu código para entrar en ${siteName}`
        : `${code} es tu código para entrar`;

export default magicCodeEmail;
