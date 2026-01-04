import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manage Test Cases - ITCS123 Admin',
  description: 'Manage input/output test cases for ITCS123 labs',
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
