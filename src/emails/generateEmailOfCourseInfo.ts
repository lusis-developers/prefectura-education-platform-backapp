import { FUDMASTER_COLORS } from "../constants/colors";

export async function generateEmailOfCourseInfo(
  name: string,
  courseName: string,
  courseDescription: string,
  courseLink: string,
  courseImage?: string
): Promise<string> {
  const year = new Date().getFullYear();

  // Design configuration
  const primaryColor = FUDMASTER_COLORS.PRIMARY;
  const secondaryColor = FUDMASTER_COLORS.SECONDARY;
  const backgroundColor = "#f4f7fa";
  const textColor = "#1f2937";
  const lightTextColor = "#6b7280";

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Información del curso - Fudmaster</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: ${backgroundColor}; color: ${textColor}; -webkit-font-smoothing: antialiased;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${backgroundColor}; padding: 40px 20px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: ${FUDMASTER_COLORS.WHITE}; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);">
                    
                    <!-- Header -->
                    <tr style="background-color: ${primaryColor};">
                        <td align="center" style="padding: 30px;">
                            <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: ${FUDMASTER_COLORS.WHITE}; letter-spacing: -0.5px; text-transform: uppercase;">Fudmaster</h1>
                        </td>
                    </tr>

                    <!-- Course Image Hero -->
                    ${courseImage ? `
                    <tr>
                        <td style="padding: 0;">
                            <img src="${courseImage}" alt="${courseName}" style="width: 100%; height: auto; display: block; object-fit: cover; max-height: 300px;">
                        </td>
                    </tr>
                    ` : ''}

                    <!-- Content Body -->
                    <tr>
                        <td style="padding: 40px 40px 30px 40px;">
                            <p style="margin: 0 0 12px 0; font-size: 16px; color: ${secondaryColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Notificación del curso</p>
                            <h2 style="margin: 0 0 20px 0; font-size: 28px; line-height: 1.2; font-weight: 800; color: ${primaryColor};">Hola, ${name}</h2>
                            
                            <p style="margin: 0 0 24px 0; font-size: 18px; line-height: 1.6; color: ${textColor};">
                                Tenemos novedades preparadas para ti en el curso <strong>${courseName}</strong>. 
                                Sigue aprendiendo y perfeccionando tus habilidades en el mundo de la pastelería.
                            </p>

                            <!-- Description Block -->
                            <div style="background-color: ${FUDMASTER_COLORS.LIGHT}; border-left: 4px solid ${secondaryColor}; padding: 24px; margin-bottom: 30px; border-radius: 0 8px 8px 0;">
                                <p style="margin: 0; font-size: 15px; line-height: 1.7; color: ${textColor}; font-style: italic;">
                                    "${courseDescription}"
                                </p>
                            </div>

                            <!-- Button Container -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="padding: 10px 0 30px 0;">
                                        <a href="${courseLink}" style="background-color: ${primaryColor}; color: ${FUDMASTER_COLORS.WHITE}; padding: 18px 36px; text-decoration: none; border-radius: 50px; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(1, 13, 39, 0.2);">
                                            Acceder al curso ahora
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 20px 0 0 0; font-size: 14px; color: ${lightTextColor}; text-align: center;">
                                Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                                <a href="${courseLink}" style="color: ${FUDMASTER_COLORS.BLUE}; text-decoration: underline;">${courseLink}</a>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr style="background-color: #fafbfc; border-top: 1px solid #edf2f7;">
                        <td style="padding: 40px; text-align: center;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: ${primaryColor};">Fudmaster</p>
                            <p style="margin: 0 0 20px 0; font-size: 12px; line-height: 1.5; color: ${lightTextColor};">
                                Estás recibiendo este correo porque eres parte de la comunidad de Fudmaster.<br>
                                © ${year} Fudmaster. Todos los derechos reservados.
                            </p>
                            
                            <!-- Simple Divider -->
                            <div style="height: 1px; background-color: #e2e8f0; width: 100px; margin: 0 auto 20px auto;"></div>
                            
                            <p style="margin: 0; font-size: 11px; color: ${lightTextColor};">
                                <a href="#" style="color: ${lightTextColor}; text-decoration: none; margin: 0 10px;">Privacidad</a> | 
                                <a href="#" style="color: ${lightTextColor}; text-decoration: none; margin: 0 10px;">Términos</a> | 
                                <a href="#" style="color: ${lightTextColor}; text-decoration: none; margin: 0 10px;">Soporte</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `;
  return html;
}
