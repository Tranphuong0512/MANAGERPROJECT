import { redirect } from 'next/navigation'

export default function RegisterPage() {
  // Đăng ký thủ công không còn được hỗ trợ
  // Người dùng chỉ cần đăng nhập bằng Google
  redirect('/login')
}
