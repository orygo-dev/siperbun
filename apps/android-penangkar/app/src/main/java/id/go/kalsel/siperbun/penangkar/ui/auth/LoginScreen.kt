package id.go.kalsel.siperbun.penangkar.ui.auth

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.MailOutline
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.go.kalsel.siperbun.penangkar.R
import id.go.kalsel.siperbun.penangkar.data.SiperbunRepository
import kotlinx.coroutines.launch

private val Glass = Color.White.copy(alpha = 0.16f)
private val GlassStroke = Color.White.copy(alpha = 0.28f)
private val Lime = Color(0xFFD4F56A)
private val FieldFill = Color.White.copy(alpha = 0.12f)
private const val DEMO_EMAIL = "demo.penangkar@siperbun.local"
private const val DEMO_PASSWORD = "password"

@Composable
fun LoginScreen(repo: SiperbunRepository) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var visible by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = Lime,
        unfocusedBorderColor = Color.White.copy(alpha = 0.35f),
        focusedLabelColor = Lime,
        unfocusedLabelColor = Color.White.copy(alpha = 0.78f),
        focusedTextColor = Color.White,
        unfocusedTextColor = Color.White,
        cursorColor = Lime,
        focusedLeadingIconColor = Lime,
        unfocusedLeadingIconColor = Color.White.copy(alpha = 0.8f),
        focusedTrailingIconColor = Color.White,
        unfocusedTrailingIconColor = Color.White.copy(alpha = 0.8f),
        focusedContainerColor = FieldFill,
        unfocusedContainerColor = FieldFill,
        focusedPlaceholderColor = Color.White.copy(alpha = 0.7f),
        unfocusedPlaceholderColor = Color.White.copy(alpha = 0.65f),
    )

    Box(Modifier.fillMaxSize()) {
        Image(
            painter = painterResource(R.drawable.login_bg),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
        )
        Box(
            Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        0f to Color.Black.copy(alpha = 0.12f),
                        0.38f to Color.Transparent,
                        0.62f to Color.Black.copy(alpha = 0.18f),
                        1f to Color.Black.copy(alpha = 0.28f),
                    ),
                ),
        )
        Column(
            Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 22.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Box(
                Modifier
                    .size(112.dp)
                    .clip(CircleShape)
                    .background(Color(0xE61A1A1A))
                    .border(1.5.dp, Color.White.copy(alpha = 0.35f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Image(
                    painter = painterResource(R.drawable.login_logo),
                    contentDescription = "Logo SIPERBUN",
                    modifier = Modifier.size(86.dp),
                    contentScale = ContentScale.Fit,
                )
            }
            Text(
                "UPTD Balai Pengawasan Sertifikasi Benih dan Proteksi Tanaman Perkebunan Provinsi Kalimantan Selatan",
                color = Color.White,
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp,
                lineHeight = 18.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .widthIn(max = 340.dp)
                    .padding(top = 14.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(Color.Black.copy(alpha = 0.42f))
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            )

            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 18.dp, bottom = 12.dp)
                    .clip(RoundedCornerShape(28.dp))
                    .background(Glass)
                    .border(1.dp, GlassStroke, RoundedCornerShape(28.dp))
                    .padding(horizontal = 20.dp, vertical = 22.dp),
            ) {
                Text("Masuk", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                Text(
                    "Gunakan akun penangkar yang terdaftar di dinas.",
                    color = Color.White.copy(alpha = 0.78f),
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 4.dp, bottom = 18.dp),
                )
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email", color = Color.Unspecified) },
                    leadingIcon = { Icon(Icons.Outlined.MailOutline, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = fieldColors,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password", color = Color.Unspecified) },
                    leadingIcon = { Icon(Icons.Outlined.Lock, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = fieldColors,
                    visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { visible = !visible }) {
                            Icon(
                                if (visible) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                                contentDescription = null,
                            )
                        }
                    },
                )
                if (error != null) {
                    Text(
                        error!!,
                        color = Color(0xFFFFC9C9),
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 10.dp),
                    )
                }
                Spacer(Modifier.height(20.dp))
                Button(
                    onClick = {
                        scope.launch {
                            loading = true
                            error = null
                            runCatching { repo.login(email, password) }
                                .onFailure { error = it.message ?: "Login gagal" }
                            loading = false
                        }
                    },
                    enabled = !loading && email.isNotBlank() && password.length >= 6,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Lime,
                        contentColor = Color(0xFF14532D),
                        disabledContainerColor = Lime.copy(alpha = 0.45f),
                        disabledContentColor = Color(0xFF14532D).copy(alpha = 0.5f),
                    ),
                ) {
                    Text(
                        if (loading) "Memproses..." else "Masuk",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                    )
                }
                Spacer(Modifier.height(10.dp))
                OutlinedButton(
                    onClick = {
                        email = DEMO_EMAIL
                        password = DEMO_PASSWORD
                        scope.launch {
                            loading = true
                            error = null
                            runCatching { repo.login(DEMO_EMAIL, DEMO_PASSWORD) }
                                .onFailure { error = it.message ?: "Login demo gagal" }
                            loading = false
                        }
                    },
                    enabled = !loading,
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.55f)),
                ) {
                    Text("Masuk Demo", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                }
                Text(
                    "Demo: $DEMO_EMAIL  ·  $DEMO_PASSWORD",
                    color = Color.White.copy(alpha = 0.72f),
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
                )
            }

            Text(
                "Bibit bersertifikat  ·  Data milik Anda",
                color = Color.White.copy(alpha = 0.7f),
                fontSize = 11.sp,
                modifier = Modifier.padding(top = 8.dp, bottom = 8.dp),
            )
        }
    }
}
